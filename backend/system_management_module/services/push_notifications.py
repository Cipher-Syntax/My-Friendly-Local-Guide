import logging
import time
from concurrent.futures import ThreadPoolExecutor

import requests
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import close_old_connections

from system_management_module.models import PushDeviceToken, PushNotificationDeliveryLog

logger = logging.getLogger(__name__)
User = get_user_model()

# Expo Push API endpoint.
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts"
MAX_RETRIES = 3
_BASE_BACKOFF_SECONDS = 1
_RECEIPT_MAX_POLLS = 4
_RECEIPT_POLL_DELAY_SECONDS = 2

# Lightweight background worker pool to avoid blocking request-response cycle.
_EXECUTOR = ThreadPoolExecutor(max_workers=4)


def _expo_headers():
    headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
    }
    access_token = getattr(settings, 'EXPO_ACCESS_TOKEN', None)
    if access_token:
        headers['Authorization'] = f'Bearer {access_token}'
    return headers


def _normalize_expo_item(response_json):
    if isinstance(response_json, dict):
        data = response_json.get('data')
        if isinstance(data, list):
            return data[0] if data else {}
        if isinstance(data, dict):
            return data
    return {}


def _poll_receipt_status(ticket_id):
    if not ticket_id:
        return None, None

    final_status = None
    final_payload = None
    for _ in range(_RECEIPT_MAX_POLLS):
        try:
            response = requests.post(
                EXPO_RECEIPTS_URL,
                json={'ids': [ticket_id]},
                headers=_expo_headers(),
                timeout=10,
            )
            response.raise_for_status()
            response_json = response.json()
            receipt = (response_json.get('data') or {}).get(ticket_id) if isinstance(response_json, dict) else None
            if not isinstance(receipt, dict):
                time.sleep(_RECEIPT_POLL_DELAY_SECONDS)
                continue

            final_payload = response_json
            receipt_status = receipt.get('status')
            if receipt_status in ('ok', 'error'):
                final_status = receipt_status
                break
        except requests.RequestException as exc:
            logger.warning('Receipt polling failed for ticket %s: %s', ticket_id, exc)

        time.sleep(_RECEIPT_POLL_DELAY_SECONDS)

    return final_status, final_payload


def send_push_to_user(user, title, body, data=None, event_key=None):
    if not user:
        return 0

    tokens = PushDeviceToken.objects.filter(user=user, is_active=True)
    if not tokens.exists():
        return 0

    queued = 0
    for token_obj in tokens:
        if event_key:
            existing = PushNotificationDeliveryLog.objects.filter(
                device_token=token_obj,
                event_key=event_key,
            ).exclude(status='failed').exists()
            if existing:
                continue

        try:
            log = PushNotificationDeliveryLog.objects.create(
                user=user,
                device_token=token_obj,
                event_key=event_key,
                title=title,
                body=body,
                data=data or {},
                status='queued',
            )
            _EXECUTOR.submit(_deliver_log_with_retry, log.id)
            queued += 1
        except Exception as exc:
            logger.exception('Failed to enqueue push delivery for user=%s token_id=%s: %s', user.id, token_obj.id, exc)

    return queued


def send_push_to_users(users, title, body, data=None, event_key=None):
    queued = 0
    for user in users:
        user_event_key = f"{event_key}:{user.id}" if event_key else None
        queued += send_push_to_user(
            user=user,
            title=title,
            body=body,
            data=data,
            event_key=user_event_key,
        )
    return queued


def deactivate_push_token(expo_push_token):
    PushDeviceToken.objects.filter(expo_push_token=expo_push_token).update(is_active=False)


def _deliver_log_with_retry(log_id):
    # Ensure thread-safe DB connection handling in worker threads.
    close_old_connections()

    try:
        log = PushNotificationDeliveryLog.objects.select_related('device_token').get(id=log_id)
    except PushNotificationDeliveryLog.DoesNotExist:
        return

    token_obj = log.device_token
    if not token_obj or not token_obj.is_active:
        log.status = 'dropped'
        log.error_message = 'Device token missing or inactive.'
        log.save(update_fields=['status', 'error_message', 'updated_at'])
        return

    payload = {
        'to': token_obj.expo_push_token,
        'title': log.title,
        'body': log.body,
        'data': log.data or {},
        'sound': 'default',
        'priority': 'high',
        'channelId': 'default',
    }

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            log.attempts = attempt
            log.status = 'retrying' if attempt > 1 else 'queued'
            log.save(update_fields=['attempts', 'status', 'updated_at'])

            response = requests.post(
                EXPO_PUSH_URL,
                json=payload,
                headers=_expo_headers(),
                timeout=10,
            )
            response.raise_for_status()
            response_json = response.json()

            ticket = _normalize_expo_item(response_json)
            ticket_status = ticket.get('status')

            if ticket_status == 'ok':
                ticket_id = ticket.get('id')
                log.status = 'sent'
                log.expo_ticket_id = ticket_id
                log.response_payload = response_json
                log.error_message = None
                log.save(update_fields=['status', 'expo_ticket_id', 'response_payload', 'error_message', 'updated_at'])

                receipt_status, receipt_payload = _poll_receipt_status(ticket_id)
                if receipt_status == 'ok':
                    log.response_payload = {
                        'ticket': response_json,
                        'receipt': receipt_payload,
                    }
                    log.error_message = None
                    log.save(update_fields=['response_payload', 'error_message', 'updated_at'])
                    return

                if receipt_status == 'error':
                    receipt = (receipt_payload.get('data') or {}).get(ticket_id, {}) if isinstance(receipt_payload, dict) else {}
                    details = receipt.get('details') or {}
                    if details.get('error') == 'DeviceNotRegistered':
                        token_obj.is_active = False
                        token_obj.save(update_fields=['is_active', 'updated_at'])
                        log.status = 'dropped'
                        log.error_message = 'Device not registered. Token deactivated (from receipt).'
                    else:
                        log.status = 'failed'
                        log.error_message = receipt.get('message') or 'Expo receipt reported delivery error.'

                    log.response_payload = {
                        'ticket': response_json,
                        'receipt': receipt_payload,
                    }
                    log.save(update_fields=['status', 'error_message', 'response_payload', 'updated_at'])
                    return

                # Receipt was not ready within polling window.
                log.response_payload = {
                    'ticket': response_json,
                    'receipt': {'status': 'pending'},
                }
                log.error_message = 'Ticket accepted; receipt still pending after polling window.'
                log.save(update_fields=['response_payload', 'error_message', 'updated_at'])
                return

            # Expo responded, but ticket has an error.
            details = ticket.get('details') or {}
            ticket_error = ticket.get('message') or 'Unknown Expo ticket error'

            if details.get('error') == 'DeviceNotRegistered':
                token_obj.is_active = False
                token_obj.save(update_fields=['is_active', 'updated_at'])
                log.status = 'dropped'
                log.error_message = 'Device not registered. Token deactivated.'
                log.response_payload = response_json
                log.save(update_fields=['status', 'error_message', 'response_payload', 'updated_at'])
                return

            if attempt >= MAX_RETRIES:
                log.status = 'failed'
                log.error_message = str(ticket_error)
                log.response_payload = response_json
                log.save(update_fields=['status', 'error_message', 'response_payload', 'updated_at'])
                return

        except requests.RequestException as exc:
            logger.warning('Push delivery attempt %s failed for log %s: %s', attempt, log.id, exc)
            if attempt >= MAX_RETRIES:
                log.status = 'failed'
                log.error_message = str(exc)
                log.save(update_fields=['status', 'error_message', 'updated_at'])
                return
        except Exception as exc:
            logger.exception('Unexpected push delivery error for log %s: %s', log.id, exc)
            log.status = 'failed'
            log.error_message = str(exc)
            log.save(update_fields=['status', 'error_message', 'updated_at'])
            return

        backoff = _BASE_BACKOFF_SECONDS * (2 ** (attempt - 1))
        time.sleep(backoff)


def build_alert_push_data(alert_type, related_model=None, related_object_id=None, extra=None):
    payload = {
        'type': alert_type,
        'related_model': related_model,
        'related_object_id': related_object_id,
    }
    if extra:
        payload.update(extra)
    return payload
