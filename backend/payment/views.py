import uuid
import os
import json
import html
from decimal import Decimal
from datetime import date, timedelta
from django.conf import settings #type: ignore
from rest_framework import generics, permissions, status, viewsets #type: ignore
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.exceptions import ValidationError as DRFValidationError, PermissionDenied #type: ignore
from django.core.exceptions import ValidationError as ModelValidationError #type: ignore
from django.shortcuts import get_object_or_404 #type: ignore
from django.apps import apps #type: ignore
from requests.exceptions import RequestException #type: ignore
from django.core.mail import send_mail #type: ignore
from django.contrib.auth import get_user_model
from django.utils import timezone #type: ignore
from django.db import transaction #type: ignore
from django.db.models import Q #type: ignore

from django.utils.decorators import method_decorator #type: ignore
from django.views.decorators.csrf import csrf_exempt #type: ignore

from .models import Payment, RefundRequest
from .serializers import (
    PaymentSerializer,
    PaymentInitiationSerializer,
    RefundRequestSerializer,
    RefundRequestCreateSerializer,
    RefundProcessSerializer,
)
from system_management_module.models import SystemAlert
from system_management_module.services.push_notifications import send_push_to_user, build_alert_push_data
from user_authentication.phone_utils import normalize_ph_phone

from .paymongo import create_checkout_session, retrieve_checkout_session, create_refund as create_gateway_refund

User = get_user_model()

try:
    Booking = apps.get_model('accommodation_booking', 'Booking')
except LookupError:
    Booking = None 


OPEN_REFUND_STATUSES = {'requested', 'under_review', 'approved'}


class IsSuperUser(permissions.BasePermission):
    def has_permission(self, request, view):
        user = getattr(request, 'user', None)
        return bool(user and user.is_authenticated and user.is_superuser)


def _extract_gateway_payment_id(payload):
    """Extract first payment id from webhook or checkout payload."""
    if not isinstance(payload, dict):
        return None

    candidates = []

    top_attrs = payload.get('data', {}).get('attributes', {})
    if isinstance(top_attrs, dict):
        candidates.append(top_attrs.get('payments'))

        nested_data = top_attrs.get('data')
        if isinstance(nested_data, dict):
            nested_attrs = nested_data.get('attributes', {})
            if isinstance(nested_attrs, dict):
                candidates.append(nested_attrs.get('payments'))

    for payments in candidates:
        if not isinstance(payments, list):
            continue
        for payment_obj in payments:
            if not isinstance(payment_obj, dict):
                continue
            payment_id = payment_obj.get('id')
            if not payment_id:
                payment_id = payment_obj.get('attributes', {}).get('id')
            if payment_id:
                return payment_id

    return None


def _target_type_for_user(user):
    if not user:
        return 'Tourist'
    if user.is_superuser:
        return 'Admin'
    if user.is_local_guide or hasattr(user, 'agency_profile') or user.is_staff:
        return 'Guide'
    return 'Tourist'


def _booking_provider(booking):
    if not booking:
        return None
    if booking.guide:
        return booking.guide
    if booking.agency:
        return booking.agency
    if booking.accommodation and booking.accommodation.host:
        return booking.accommodation.host
    return None


def _format_php(value):
    try:
        return f"PHP {Decimal(value):,.2f}"
    except Exception:
        return f"PHP {value}"
    
def _is_agency_user(user):
    return bool(user and hasattr(user, 'agency_profile'))

def _booking_label(booking):
    if not booking:
        return 'N/A'
    if getattr(booking, 'destination', None) and getattr(booking.destination, 'name', None):
        return str(booking.destination.name)
    if getattr(booking, 'accommodation', None) and getattr(booking.accommodation, 'title', None):
        return str(booking.accommodation.title)
    return f"Booking #{getattr(booking, 'id', 'N/A')}"

def _agency_dashboard_url(*, booking_id=None, refund_id=None):
    base_url = str(getattr(settings, 'FRONTEND_URL', '') or '').rstrip('/')
    if not base_url:
        return '/agency'

    query_parts = []
    if booking_id:
        query_parts.append(f"booking_id={booking_id}")
    if refund_id:
        query_parts.append(f"refund_id={refund_id}")

    query_string = f"?{'&'.join(query_parts)}" if query_parts else ''
    return f"{base_url}/agency{query_string}"


def _refund_status_color(status_value):
    normalized = str(status_value or '').lower()
    mapping = {
        'requested': '#0EA5E9',
        'under_review': '#1D4ED8',
        'approved': '#16A34A',
        'rejected': '#DC2626',
        'completed': '#0F766E',
    }
    return mapping.get(normalized, '#0F766E')


def _build_refund_email_html(
    *,
    heading,
    subheading,
    recipient_name,
    intro_message,
    detail_rows,
    status_label=None,
    notes=None,
    accent_color='#0F766E',
    cta_label=None,
    cta_url=None,
    cta_hint=None,
):
    safe_heading = html.escape(str(heading or 'LocaLynk Refund Center'))
    safe_subheading = html.escape(str(subheading or 'Refund Update'))
    safe_recipient = html.escape(str(recipient_name or 'Valued User'))
    safe_intro = html.escape(str(intro_message or '')).replace('\n', '<br/>')

    rows_html = ''
    for label, value in detail_rows:
        safe_label = html.escape(str(label or ''))
        safe_value = html.escape(str(value if value is not None else 'N/A')).replace('\n', '<br/>')
        rows_html += (
            '<tr>'
            f'<td style="padding: 8px 0; color: #64748b; width: 40%; font-weight: 600;">{safe_label}</td>'
            f'<td style="padding: 8px 0; color: #0f172a; font-weight: 700; text-align: right;">{safe_value}</td>'
            '</tr>'
        )

    status_html = ''
    if status_label:
        safe_status = html.escape(str(status_label))
        status_html = (
            '<div style="margin: 12px 0 16px 0;">'
            f'<span style="display: inline-block; padding: 6px 12px; border-radius: 999px; '
            f'font-size: 11px; font-weight: 700; color: #ffffff; background: {accent_color};">{safe_status}</span>'
            '</div>'
        )

    notes_html = ''
    if notes:
        safe_notes = html.escape(str(notes)).replace('\n', '<br/>')
        notes_html = (
            '<div style="margin-top: 18px; border-top: 1px dashed #cbd5e1; padding-top: 12px;">'
            '<div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Admin Notes</div>'
            f'<div style="font-size: 14px; color: #334155; line-height: 1.6;">{safe_notes}</div>'
            '</div>'
        )
    
    cta_html = ''
    if cta_label and cta_url:
        safe_cta_label = html.escape(str(cta_label))
        safe_cta_url = html.escape(str(cta_url), quote=True)
        safe_cta_hint = html.escape(str(cta_hint or '')).replace('\n', '<br/>')
        hint_html = (
            f'<div style="font-size: 12px; color: #64748b; margin-top: 10px;">{safe_cta_hint}</div>'
            if safe_cta_hint
            else ''
        )
        cta_html = (
            '<div style="margin-top: 18px; text-align: center;">'
            f'<a href="{safe_cta_url}" '
            'style="display: inline-block; padding: 11px 16px; border-radius: 8px; '
            f'background: {accent_color}; color: #ffffff; text-decoration: none; '
            'font-size: 13px; font-weight: 700;">'
            f'{safe_cta_label}'
            '</a>'
            f'{hint_html}'
            '</div>'
        )

    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset=\"UTF-8\" />
        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
        <title>{safe_subheading}</title>
    </head>
    <body style=\"margin: 0; padding: 28px 14px; background: #f8fafc; font-family: 'Poppins', Arial, sans-serif; color: #334155;\">
        <div style=\"max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;\">
            <div style=\"padding: 22px 22px; background: {accent_color}; color: #ffffff;\">
                <div style=\"font-size: 13px; opacity: 0.9; letter-spacing: 0.6px; text-transform: uppercase;\">{safe_heading}</div>
                <div style=\"font-size: 22px; font-weight: 800; margin-top: 6px;\">{safe_subheading}</div>
            </div>

            <div style=\"padding: 24px 22px;\">
                <p style=\"margin: 0 0 10px 0; color: #0f172a; font-weight: 700; font-size: 16px;\">Hi {safe_recipient},</p>
                <p style=\"margin: 0; color: #475569; font-size: 14px; line-height: 1.65;\">{safe_intro}</p>

                {status_html}

                <div style=\"border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; background: #f8fafc;\">
                    <div style=\"font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;\">Refund Details</div>
                    <table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"font-size: 14px; border-collapse: collapse;\">
                        {rows_html}
                    </table>
                </div>

                {notes_html}
                {cta_html}
            </div>

            <div style=\"background: #f1f5f9; padding: 14px 18px; color: #64748b; font-size: 12px; text-align: center;\">
                This is an automated refund update from LocaLynk.<br/>
                Please do not reply directly to this email.
            </div>
        </div>
    </body>
    </html>
    """


def _safe_send_mail(subject, plain_message, recipient_list, html_message=None):
    if not recipient_list:
        return
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=True,
        )
    except Exception as exc:
        print(f"Email send failed: {exc}")


def _notify_user(user, title, body, related_model=None, related_object_id=None, alert_type='system_update', event_key=None):
    if not user:
        return

    SystemAlert.objects.create(
        target_type=_target_type_for_user(user),
        recipient=user,
        title=title,
        message=body,
        related_model=related_model,
        related_object_id=related_object_id,
        is_read=False,
    )

    send_push_to_user(
        user=user,
        title=title,
        body=body,
        data=build_alert_push_data(
            alert_type=alert_type,
            related_model=related_model,
            related_object_id=related_object_id,
        ),
        event_key=event_key,
    )


def get_booking_tour_package_payload(booking):
    try:
        from accommodation_booking.serializers import BookingSerializer
        data = BookingSerializer(booking, context={}).data
        payload = data.get('tour_package_detail')
        return payload if isinstance(payload, dict) else None
    except Exception:
        return None


def get_booking_display_days(booking, package_payload=None):
    if not booking.check_in or not booking.check_out:
        return 1

    # Keep receipt behavior aligned with booking details modal: inclusive day span.
    return max((booking.check_out - booking.check_in).days + 1, 1)


def format_booking_date_display(check_in, check_out, duration_days=1):
    if not check_in:
        return "N/A"

    if duration_days <= 1:
        return str(check_in)

    computed_end = check_in + timedelta(days=max(duration_days - 1, 1))
    end_for_display = computed_end

    if check_out and check_out > computed_end:
        end_for_display = check_out

    return f"{check_in} to {end_for_display}"


def build_itinerary_sections(package_payload, trip_days):
    if not package_payload:
        return "", ""

    timeline = package_payload.get('itinerary_timeline', [])
    if isinstance(timeline, str):
        try:
            timeline = json.loads(timeline)
        except json.JSONDecodeError:
            timeline = []

    if not isinstance(timeline, list) or not timeline:
        return "", ""

    grouped = {}
    for item in timeline:
        if not isinstance(item, dict):
            continue
        try:
            day_num = int(item.get('day', 1))
        except (TypeError, ValueError):
            day_num = 1
        if day_num > trip_days:
            continue
        grouped.setdefault(day_num, []).append(item)

    if not grouped:
        return "", ""

    html = """
    <div class="summary-box" style="border-top: 1px dashed #cbd5e1; border-bottom: none; margin-top: 20px; margin-bottom: 10px; padding-top: 20px;">
        <div class="summary-title">Tour Itinerary</div>
    """
    plain = "\nTour Itinerary:\n"

    for day in sorted(grouped.keys()):
        html += f"<p style='margin: 8px 0 4px 0; color: #1D4ED8; font-weight: 700;'>Day {day}</p>"
        plain += f"Day {day}:\n"

        for stop in grouped[day]:
            activity = stop.get('activityName') or stop.get('name') or 'Activity Stop'
            start = stop.get('startTime')
            end = stop.get('endTime')
            time_text = f" ({start}{(' - ' + end) if end else ''})" if start else ""

            html += f"<p style='margin: 2px 0 2px 12px; color: #475569;'>- <strong>{activity}</strong>{time_text}</p>"
            plain += f"  - {activity}{time_text}\n"

    html += "</div>"
    return html, plain

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(payer=self.request.user).order_by("-timestamp")

class PaymentInitiationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    SUBSCRIPTION_PRICE = Decimal("3000")

    def post(self, request, *args, **kwargs):
        serializer = PaymentInitiationSerializer(data=request.data)
        if not serializer.is_valid():
             raise DRFValidationError(serializer.errors)
        
        user = request.user
        payment_type = serializer.validated_data.get("payment_type")
        raw_method = serializer.validated_data.get("payment_method", "").lower()
        
        description = ""
        final_amount = Decimal("0.00")

        booking_instance = None
        if payment_type == "YearlySubscription":
            final_amount = self.SUBSCRIPTION_PRICE
            description = "Guide Yearly Subscription"
        elif payment_type == "Booking":
            booking_instance = serializer.booking_instance
            if not booking_instance:
                raise DRFValidationError({"detail": "Booking is required."})
            final_amount = serializer.validated_data["final_amount"]
            description = f"Booking Payment #{booking_instance.id}"
        else:
            raise DRFValidationError({"detail": "Invalid payment type."})

        if final_amount <= 0:
            raise DRFValidationError({"detail": "Invalid payment amount."})

        payment = Payment.objects.create(
            payer=user,
            payment_type=payment_type,
            related_booking=booking_instance,
            amount=final_amount,
            payment_method=raw_method,
            status="pending",
        )

        normalized_phone = ""
        if user.phone_number:
            try:
                normalized_phone = normalize_ph_phone(user.phone_number, "phone_number")
                
                if normalized_phone.startswith("+63"):
                    normalized_phone = "0" + normalized_phone[3:]
                    
            except DRFValidationError:
                normalized_phone = ""

        billing_data = {
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "phone": normalized_phone
        }
        
        try:
            paymongo_types = []
            
            if 'card' in raw_method: 
                paymongo_types = ['card']
            elif 'paymaya' in raw_method or 'maya' in raw_method:
                paymongo_types = ['paymaya']
            elif 'qrph' in raw_method:
                paymongo_types = ['qrph']
            else:
                paymongo_types = ['gcash']

            print(f"DEBUG: Payment Method Requested: '{raw_method}' -> Mapped to PayMongo Type: {paymongo_types}")

            result = create_checkout_session(
                amount=final_amount,
                description=description,
                billing=billing_data,
                payment_method_types=paymongo_types
            )
                
            checkout_url = result['checkout_url']
            transaction_id = result['transaction_id'] 

            payment.gateway_transaction_id = transaction_id
            payment.save()

            if not checkout_url:
                raise DRFValidationError({"detail": "Failed to generate redirect URL."})

            return Response({
                "checkout_url": checkout_url, 
                "payment_id": payment.id 
            }, status=status.HTTP_201_CREATED)

        except RuntimeError as e:
            print(f"!!! PAYMONGO API ERROR: {str(e)}")
            payment.status = 'failed'
            payment.save()
            raise DRFValidationError({"detail": str(e)})


@method_decorator(csrf_exempt, name='dispatch')
class PaymentWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        event_type = data.get("data", {}).get("attributes", {}).get("type")
        if not event_type: event_type = data.get("type")

        transaction_id = None
        if 'checkout_session' in event_type:
             transaction_id = data.get("data", {}).get("attributes", {}).get("data", {}).get("id")
             if not transaction_id: transaction_id = data.get("data", {}).get("id")

        if not transaction_id:
             return Response({"detail": "Could not identify transaction ID"}, status=400)

        try:
            payment = Payment.objects.get(gateway_transaction_id=transaction_id)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found"}, status=404)

        if 'paid' in event_type or 'succeeded' in event_type:
            self._handle_success(payment, data)
        elif 'failed' in event_type:
            payment.status = "failed"
            payment.save()

        return Response({"status": "Webhook processed"}, status=200)

    def _handle_success(self, payment, data):
        if payment.status == 'refunded':
            return

        if payment.status != 'succeeded':
            gateway_payment_id = _extract_gateway_payment_id(data)
            payment.status = "succeeded"
            payment.gateway_response = data
            if gateway_payment_id:
                payment.gateway_payment_id = gateway_payment_id
            payment.save()

            if payment.related_booking:
                booking = payment.related_booking
                
                try:
                    booking.status = "Confirmed"
                    
                    commission_rate = Decimal("0.02")
                    platform_fee = (booking.total_price * commission_rate).quantize(Decimal("0.01"))
                    
                    net_payout = (booking.down_payment - platform_fee).quantize(Decimal("0.01"))
                    
                    booking.platform_fee = platform_fee
                    booking.guide_payout_amount = net_payout
                    booking.is_payout_settled = False
                    
                    booking.save() 
                    
                    if booking.guide:
                        booking.guide.booking_count += 1
                        booking.guide.save()

                    try:
                        provider_name = "Local Service"
                        if booking.guide:
                            provider_name = f"Guide: {booking.guide.get_full_name() or booking.guide.username}"
                        elif booking.agency:
                            provider_name = f"Agency: {booking.agency.username}"

                        subject = f"Your Booking Receipt - #{booking.id}"

                        package_payload = get_booking_tour_package_payload(booking)
                        trip_days = get_booking_display_days(booking, package_payload)
                        booking_date_display = format_booking_date_display(booking.check_in, booking.check_out, trip_days)
                        itinerary_html, itinerary_plain = build_itinerary_sections(package_payload, trip_days)

                        plain_content = (
                            f"Booking Confirmed!\n"
                            f"Dates: {booking_date_display}\n"
                            f"Provider: {provider_name}\n"
                            f"Destination: {booking.destination or 'N/A'}\n"
                            f"Transaction ID: {payment.gateway_transaction_id}\n"
                            f"{itinerary_plain}"
                        )
                        
                        html_content = f"""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; color: #333; }}
                                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }}
                                .header {{ background-color: #0072FF; padding: 30px 20px; text-align: center; color: #ffffff; font-size: 24px; font-weight: bold; }}
                                .content {{ padding: 30px; line-height: 1.6; font-size: 16px; color: #475569; }}
                                .summary-box {{ border-bottom: 1px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 20px; }}
                                .summary-title {{ font-size: 12px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; }}
                                .table-row {{ padding: 6px 0; }}
                                .highlight-blue {{ color: #0072FF; font-weight: bold; }}
                                .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
                                .tx-box {{ background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; font-size: 12px; color: #64748b; margin-top: 30px; border: 1px solid #e2e8f0; }}
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">LocaLynk Booking Receipt</div>
                                <div class="content">
                                    <h2 style="color: #333; margin-top: 0; text-align: center;">Booking Confirmed!</h2>
                                    <p style="text-align: center; font-size: 14px; color: #94a3b8; margin-top: -10px;">{date.today().strftime('%B %d, %Y')}</p>

                                    <div class="summary-box">
                                        <div class="summary-title">Itinerary Details</div>
                                        <p style="margin: 5px 0;"><strong>Dates:</strong> {booking_date_display}</p>
                                        <p style="margin: 5px 0;"><strong>Provider:</strong> {provider_name}</p>
                                        <p style="margin: 5px 0;"><strong>Destination:</strong> {booking.destination or 'N/A'}</p>
                                    </div>

                                    {itinerary_html}

                                    <div>
                                        <div class="summary-title">Payment Breakdown</div>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td class="table-row" align="left">Total Trip Cost:</td>
                                                <td class="table-row" align="right">&#8369; {booking.total_price:,.2f}</td>
                                            </tr>
                                            <tr>
                                                <td class="table-row highlight-blue" align="left">Down Payment Paid (30%):</td>
                                                <td class="table-row highlight-blue" align="right">&#8369; {booking.down_payment:,.2f}</td>
                                            </tr>
                                            <tr>
                                                <td class="table-row" align="left" style="color: #64748b; font-weight: bold;">Balance (Pay to Provider):</td>
                                                <td class="table-row" align="right" style="color: #64748b; font-weight: bold;">&#8369; {booking.balance_due:,.2f}</td>
                                            </tr>
                                        </table>
                                    </div>

                                    <div class="tx-box">
                                        <strong>Transaction ID:</strong><br/>
                                        <span style="font-family: monospace;">{payment.gateway_transaction_id}</span>
                                    </div>
                                </div>
                                <div class="footer">&copy; 2026 LocaLynk. All rights reserved.</div>
                            </div>
                        </body>
                        </html>
                        """
                        send_mail(subject, plain_content, settings.DEFAULT_FROM_EMAIL, [payment.payer.email], html_message=html_content)
                    except Exception as e:
                        print(f"Error sending HTML receipt: {e}")

                    send_push_to_user(
                        user=booking.tourist,
                        title='Payment Successful',
                        body=f"Your booking #{booking.id} is confirmed.",
                        data=build_alert_push_data(
                            alert_type='payment_success',
                            related_model='Booking',
                            related_object_id=booking.id,
                        ),
                        event_key=f"payment-success:{payment.id}:tourist",
                    )

                    provider = booking.guide or booking.agency or (booking.accommodation.host if booking.accommodation else None)
                    if provider:
                        tourist_name = f"{booking.tourist.first_name} {booking.tourist.last_name}"
                        SystemAlert.objects.create(
                            target_type='Guide',
                            recipient=provider,
                            title="New Confirmed Booking",
                            message=f"New trip confirmed! {tourist_name} booked for {booking.check_in}. Payout pending: ₱{net_payout}.",
                            related_object_id=booking.id,
                            related_model='Booking',
                            is_read=False
                        )

                        send_push_to_user(
                            user=provider,
                            title='Payment Successful',
                            body=f"{tourist_name} completed payment for booking #{booking.id}.",
                            data=build_alert_push_data(
                                alert_type='payment_success',
                                related_model='Booking',
                                related_object_id=booking.id,
                            ),
                            event_key=f"payment-success:{payment.id}:provider",
                        )
                        
                        try:
                            p_subject = "Action Required: New Confirmed Booking"
                            provider_itinerary_display = format_booking_date_display(
                                booking.check_in,
                                booking.check_out,
                                get_booking_display_days(booking, package_payload)
                            )

                            p_plain_message = (
                                f"Hi {provider.username},\n\n"
                                f"A new booking has been confirmed by {tourist_name}.\n\n"
                                f"Itinerary: {provider_itinerary_display}\n"
                                f"Your Pending Payout (from down payment): ₱{net_payout:,.2f}\n\n"
                                f"The tourist will pay the remaining balance of ₱{booking.balance_due:,.2f} directly to you. Please check your dashboard for details."
                            )
                            p_html_message = f"""
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <style>
                                    body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; color: #333; }}
                                    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }}
                                    .header {{ background-color: #10b981; padding: 30px 20px; text-align: center; color: #ffffff; font-size: 24px; font-weight: bold; }}
                                    .content {{ padding: 30px; line-height: 1.6; font-size: 16px; color: #475569; }}
                                    .highlight {{ font-weight: bold; color: #333; }}
                                    .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
                                    .btn {{ display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; text-align: center; }}
                                    .details-box {{ background: #f1f5f9; padding: 20px 20px 20px 40px; border-radius: 8px; margin: 20px 0; }}
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">New Confirmed Booking!</div>
                                    <div class="content">
                                        <p>Hi {provider.username},</p>
                                        <p>Great news! A new booking has just been confirmed by <span class="highlight">{tourist_name}</span>.</p>
                                        
                                        <ul class="details-box">
                                            <li><span class="highlight">Itinerary:</span> {provider_itinerary_display}</li>
                                            <li><span class="highlight">Your Pending Payout:</span> &#8369; {net_payout:,.2f} <span style="font-size: 12px; color: #64748b;">(From down payment)</span></li>
                                            <li><span class="highlight">Balance Due:</span> &#8369; {booking.balance_due:,.2f} <span style="font-size: 12px; color: #64748b;">(To be paid directly to you)</span></li>
                                        </ul>

                                        <p>Please log in to your dashboard to view the full details and communicate with the tourist.</p>
                                        <div style="text-align: center;">
                                            <a href="{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/login" class="btn">View Booking Dashboard</a>
                                        </div>
                                    </div>
                                    <div class="footer">&copy; 2026 LocaLynk Partner Network.</div>
                                </div>
                            </body>
                            </html>
                            """
                            send_mail(
                                p_subject, 
                                p_plain_message, 
                                settings.DEFAULT_FROM_EMAIL, 
                                [provider.email],
                                html_message=p_html_message
                            )
                        except Exception as e:
                            print(f"Error notifying provider: {e}")

                except ModelValidationError as e:
                    print(f"CRITICAL: Booking Save Failed for Payment {payment.id}. Error: {e}")
                    payment.status = "refund_required" 
                    payment.save()
                    booking.status = "Cancelled"
                    booking.save(update_fields=['status']) 

                    SystemAlert.objects.create(
                        target_type='Tourist',
                        recipient=booking.tourist,
                        title="Booking Failed - Refund Initiated",
                        message=f"We are sorry! The dates were booked by another user while you were paying. Your payment of {payment.amount} will be refunded shortly.",
                        related_object_id=booking.id,
                        related_model='Booking',
                        is_read=False
                    )

                    send_push_to_user(
                        user=booking.tourist,
                        title='Payment Update',
                        body='Your booking could not be confirmed. Refund has been initiated.',
                        data=build_alert_push_data(
                            alert_type='refund_initiated',
                            related_model='Booking',
                            related_object_id=booking.id,
                        ),
                        event_key=f"payment-refund:{payment.id}:tourist",
                    )

            if payment.payment_type == "YearlySubscription":
                user = payment.payer
                user.guide_tier = 'paid'
                user.subscription_end_date = date.today() + timedelta(days=365)
                user.save()


class PaymentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, payment_id):
        payment = get_object_or_404(Payment, id=payment_id, payer=request.user)

        if payment.status == 'pending' and payment.gateway_transaction_id:
            pm_data = retrieve_checkout_session(payment.gateway_transaction_id)
            
            if pm_data:
                attributes = pm_data.get('data', {}).get('attributes', {})
                checkout_status = attributes.get('payment_status')
                
                is_paid = (checkout_status == 'paid')
                if not is_paid:
                    payments_list = attributes.get('payments', [])
                    if payments_list and payments_list[0]['attributes']['status'] == 'paid':
                        is_paid = True

                if is_paid:
                    PaymentWebhookView()._handle_success(payment, pm_data)

        return Response({
            "status": payment.status,
            "payment_type": payment.payment_type,
            "amount": str(payment.amount), 
            "refund_status": payment.refund_status,
            "refunded_amount": str(payment.refunded_amount),
        })

class SubscriptionPriceView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return Response({
            "price": PaymentInitiationView.SUBSCRIPTION_PRICE,
            "guide_limit": 2, 
            "booking_limit": 1 
        })


class MyRefundRequestListView(generics.ListAPIView):
    serializer_class = RefundRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = (
            RefundRequest.objects
            .select_related('payment', 'booking', 'requested_by', 'processed_by')
            .filter(requested_by=self.request.user)
            .order_by('-request_date')
        )

        booking_id = self.request.query_params.get('booking_id')
        payment_id = self.request.query_params.get('payment_id')
        status_filter = self.request.query_params.get('status')

        if booking_id:
            qs = qs.filter(booking_id=booking_id)
        if payment_id:
            qs = qs.filter(payment_id=payment_id)
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs


class ProviderRefundRequestListView(generics.ListAPIView):
    serializer_class = RefundRequestSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return (
            RefundRequest.objects
            .select_related('payment', 'booking', 'requested_by', 'processed_by')
            .filter(
                Q(booking__guide=user) |
                Q(booking__agency=user) |
                Q(booking__accommodation__host=user)
            )
            .distinct()
            .order_by('-request_date')
        )


class AdminRefundRequestListView(generics.ListAPIView):
    serializer_class = RefundRequestSerializer
    permission_classes = [IsSuperUser]

    def get_queryset(self):
        qs = RefundRequest.objects.select_related('payment', 'booking', 'requested_by', 'processed_by').order_by('-request_date')

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        return qs


class RefundRequestDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, refund_id, user):
        refund_request = get_object_or_404(
            RefundRequest.objects.select_related('payment', 'booking', 'requested_by', 'processed_by'),
            id=refund_id,
        )

        if user.is_superuser:
            return refund_request

        if refund_request.requested_by_id != user.id:
            raise PermissionDenied('Only the requesting tourist can view refund request details.')

        return refund_request

    def get(self, request, refund_id):
        refund_request = self.get_object(refund_id, request.user)
        serializer = RefundRequestSerializer(refund_request, context={'request': request})
        return Response(serializer.data)


class RefundRequestCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        serializer = RefundRequestCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        payment = serializer.validated_data['payment']
        booking = serializer.validated_data['booking']
        requested_amount = serializer.validated_data['requested_amount']
        reason = serializer.validated_data['reason']
        proof_attachment = serializer.validated_data['proof_attachment']

        refund_request = RefundRequest.objects.create(
            payment=payment,
            booking=booking,
            requested_by=request.user,
            reason=reason,
            requested_amount=requested_amount,
            proof_attachment=proof_attachment,
            status='requested',
        )

        payment.refund_status = 'requested'
        payment.save(update_fields=['refund_status'])

        tourist_message = (
            f"Your refund request for booking #{booking.id} was submitted and is waiting for admin review."
        )

        _notify_user(
            request.user,
            title='Refund Request Submitted',
            body=tourist_message,
            related_model='RefundRequest',
            related_object_id=refund_request.id,
            alert_type='refund_requested',
            event_key=f"refund-requested:{refund_request.id}:tourist",
        )

        admins = User.objects.filter(is_superuser=True).exclude(id=request.user.id)
        admin_emails = []
        for admin in admins:
            admin_msg = f"New refund request #{refund_request.id} for booking #{booking.id} requires review."
            _notify_user(
                admin,
                title='New Refund Request',
                body=admin_msg,
                related_model='RefundRequest',
                related_object_id=refund_request.id,
                alert_type='refund_review_required',
                event_key=f"refund-requested:{refund_request.id}:admin:{admin.id}",
            )
            if admin.email:
                admin_emails.append(admin.email)

        tourist_html_message = _build_refund_email_html(
            heading='LocaLynk Refund Center',
            subheading='Refund Request Received',
            recipient_name=request.user.first_name or request.user.username,
            intro_message='We received your refund request and it is now waiting for admin review.',
            detail_rows=[
                ('Refund ID', f"#{refund_request.id}"),
                ('Booking ID', f"#{booking.id}"),
                ('Requested Amount', _format_php(requested_amount)),
                ('Reason', reason),
            ],
            status_label='Requested',
            accent_color=_refund_status_color('requested'),
        )

        admin_html_message = _build_refund_email_html(
            heading='LocaLynk Refund Center',
            subheading='New Refund Request For Review',
            recipient_name='Admin Team',
            intro_message='A tourist submitted a new refund request that needs your review and action.',
            detail_rows=[
                ('Refund ID', f"#{refund_request.id}"),
                ('Booking ID', f"#{booking.id}"),
                ('Tourist', request.user.username),
                ('Tourist Email', request.user.email or 'N/A'),
                ('Requested Amount', _format_php(requested_amount)),
                ('Reason', reason),
            ],
            status_label='Requested',
            accent_color='#F97316',
        )

        _safe_send_mail(
            subject=f"LocaLynk Refund Request Received - #{refund_request.id}",
            plain_message=(
                f"Hi {request.user.first_name or request.user.username},\n\n"
                f"We received your refund request for booking #{booking.id}.\n"
                f"Requested amount: PHP {requested_amount}\n"
                f"Reason: {reason}\n\n"
                "Our team is now reviewing your request."
            ),
            recipient_list=[request.user.email] if request.user.email else [],
            html_message=tourist_html_message,
        )

        _safe_send_mail(
            subject=f"New Refund Request Needs Review - #{refund_request.id}",
            plain_message=(
                f"A new refund request was submitted.\n\n"
                f"Refund ID: {refund_request.id}\n"
                f"Booking ID: {booking.id}\n"
                f"Tourist: {request.user.username}\n"
                f"Requested amount: PHP {requested_amount}\n"
                f"Reason: {reason}\n"
            ),
            recipient_list=admin_emails,
            html_message=admin_html_message,
        )

        return Response(
            RefundRequestSerializer(refund_request, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class RefundRequestProcessView(APIView):
    permission_classes = [IsSuperUser]
    parser_classes = (JSONParser,)

    @transaction.atomic
    def post(self, request, refund_id):
        refund_request = get_object_or_404(
            RefundRequest.objects.select_related('payment', 'booking', 'requested_by'),
            id=refund_id,
        )

        serializer = RefundProcessSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action = serializer.validated_data['action']
        admin_notes = (serializer.validated_data.get('admin_notes') or '').strip()
        payment = refund_request.payment
        booking = refund_request.booking
        now = timezone.now()

        default_amount = refund_request.approved_amount or refund_request.requested_amount
        final_amount = serializer.validated_data.get('approved_amount', default_amount)
        final_amount = Decimal(final_amount).quantize(Decimal('0.01'))

        if action in ('approve', 'complete'):
            if final_amount <= 0:
                raise DRFValidationError({'approved_amount': 'Approved amount must be greater than zero.'})
            if final_amount > payment.amount:
                raise DRFValidationError({'approved_amount': 'Approved amount cannot exceed paid downpayment.'})

        if action == 'under_review':
            if refund_request.status != 'requested':
                raise DRFValidationError({'detail': 'Only requested refunds can move to under review.'})
            refund_request.status = 'under_review'
            refund_request.processed_by = request.user
            refund_request.process_date = now
            if admin_notes:
                refund_request.admin_notes = admin_notes
            refund_request.save(update_fields=['status', 'processed_by', 'process_date', 'admin_notes'])

            payment.refund_status = 'under_review'
            payment.save(update_fields=['refund_status'])

            notify_title = 'Refund Under Review'
            tourist_body = f"Your refund request #{refund_request.id} is now under review."
            provider_body = f"Refund request #{refund_request.id} is under admin review."

        elif action == 'approve':
            if refund_request.status not in {'requested', 'under_review'}:
                raise DRFValidationError({'detail': 'Only requested or under-review refunds can be approved.'})

            refund_request.status = 'approved'
            refund_request.approved_amount = final_amount
            refund_request.processed_by = request.user
            refund_request.process_date = now
            if admin_notes:
                refund_request.admin_notes = admin_notes
            refund_request.save(update_fields=['status', 'approved_amount', 'processed_by', 'process_date', 'admin_notes'])

            payment.refund_status = 'approved'
            payment.save(update_fields=['refund_status'])

            if booking and booking.status not in {'Completed', 'Refunded', 'Cancelled'}:
                booking.status = 'Cancelled'
                booking.save(update_fields=['status'])

            notify_title = 'Refund Approved'
            tourist_body = f"Your refund request #{refund_request.id} was approved for PHP {final_amount}."
            provider_body = f"Refund request #{refund_request.id} was approved by admin."

        elif action == 'reject':
            if refund_request.status not in {'requested', 'under_review', 'approved'}:
                raise DRFValidationError({'detail': 'Only open refunds can be rejected.'})

            refund_request.status = 'rejected'
            refund_request.processed_by = request.user
            refund_request.process_date = now
            if admin_notes:
                refund_request.admin_notes = admin_notes
            refund_request.save(update_fields=['status', 'processed_by', 'process_date', 'admin_notes'])

            payment.refund_status = 'rejected'
            payment.save(update_fields=['refund_status'])

            notify_title = 'Refund Rejected'
            reason_suffix = f" Reason: {admin_notes}" if admin_notes else ''
            tourist_body = f"Your refund request #{refund_request.id} was rejected.{reason_suffix}"
            provider_body = f"Refund request #{refund_request.id} was rejected by admin."

        elif action == 'complete':
            if refund_request.status not in {'approved', 'under_review', 'requested'}:
                raise DRFValidationError({'detail': 'Refund can only be completed from an open or approved state.'})

            gateway_response = None
            gateway_refund_id = None

            if payment.gateway_payment_id:
                try:
                    gateway_result = create_gateway_refund(
                        payment_id=payment.gateway_payment_id,
                        amount=final_amount,
                        reason='requested_by_customer',
                        notes=admin_notes,
                    )
                    gateway_refund_id = gateway_result.get('refund_id')
                    gateway_response = gateway_result.get('raw')
                except RuntimeError as exc:
                    raise DRFValidationError({'detail': str(exc)})
            else:
                gateway_response = {
                    'manual_processing': True,
                    'note': 'Gateway payment ID missing. Completed manually by admin.',
                }

            refund_request.status = 'completed'
            refund_request.approved_amount = final_amount
            refund_request.processed_by = request.user
            refund_request.process_date = refund_request.process_date or now
            refund_request.completed_date = now
            refund_request.gateway_refund_id = gateway_refund_id
            refund_request.gateway_response = gateway_response
            if admin_notes:
                refund_request.admin_notes = admin_notes
            refund_request.save(
                update_fields=[
                    'status',
                    'approved_amount',
                    'processed_by',
                    'process_date',
                    'completed_date',
                    'gateway_refund_id',
                    'gateway_response',
                    'admin_notes',
                ]
            )

            payment.refund_status = 'completed'
            payment.refunded_amount = final_amount
            payment.refunded_at = now
            payment.status = 'refunded'
            payment.save(update_fields=['refund_status', 'refunded_amount', 'refunded_at', 'status'])

            if booking and booking.status != 'Refunded':
                booking.status = 'Refunded'
                booking.save(update_fields=['status'])

            notify_title = 'Refund Completed'
            tourist_body = f"Your refund for booking #{booking.id if booking else 'N/A'} has been completed (PHP {final_amount})."
            provider_body = f"Refund for booking #{booking.id if booking else 'N/A'} has been completed."

        else:
            raise DRFValidationError({'action': 'Unsupported action.'})

        admin_notes_text = (refund_request.admin_notes or '').strip()
        admin_notes_line = f"\nAdmin Notes: {admin_notes_text}" if admin_notes_text else ''

        provider = _booking_provider(booking)
        provider_notification_allowed = action in {'approve', 'complete'}
        _notify_user(
            refund_request.requested_by,
            title=notify_title,
            body=tourist_body,
            related_model='RefundRequest',
            related_object_id=refund_request.id,
            alert_type=f"refund_{action}",
            event_key=f"refund-{action}:{refund_request.id}:tourist",
        )

        if provider and provider_notification_allowed:
            if _is_agency_user(provider):
                provider_dashboard_url = _agency_dashboard_url(
                    booking_id=booking.id if booking else None,
                    refund_id=refund_request.id,
                )
                provider_name = provider.first_name or provider.username

                _safe_send_mail(
                    subject=f"Refund Update For Booking #{booking.id if booking else 'N/A'}",
                    plain_message=(
                        f"Hi {provider_name},\n\n"
                        f"{provider_body}\n"
                        f"Refund ID: {refund_request.id}\n"
                        f"Booking ID: {booking.id if booking else 'N/A'}\n"
                        f"Booking: {_booking_label(booking)}\n"
                        f"Status: {str(refund_request.status).replace('_', ' ').title()}\n"
                        f"Approved Amount: {final_amount}"
                        f"{admin_notes_line}\n\n"
                        f"Open your agency dashboard for details: {provider_dashboard_url}"
                    ),
                    recipient_list=[provider.email] if provider.email else [],
                    html_message=_build_refund_email_html(
                        heading='LocaLynk Agency Refund Notice',
                        subheading='Refund Status Update',
                        recipient_name=provider_name,
                        intro_message=provider_body,
                        detail_rows=[
                            ('Refund ID', f"#{refund_request.id}"),
                            ('Booking ID', f"#{booking.id if booking else 'N/A'}"),
                            ('Booking', _booking_label(booking)),
                            ('Requested Amount', _format_php(refund_request.requested_amount)),
                            ('Approved Amount', _format_php(final_amount)),
                            ('Status', str(refund_request.status).replace('_', ' ').title()),
                        ],
                        status_label=str(refund_request.status).replace('_', ' ').title(),
                        notes=refund_request.admin_notes,
                        accent_color=_refund_status_color(refund_request.status),
                        cta_label='View Agency Dashboard',
                        cta_url=provider_dashboard_url,
                        cta_hint=(
                            f"Open Bookings Management and search Booking #{booking.id}."
                            if booking
                            else 'Open Bookings Management to review this refund.'
                        ),
                    ),
                )
            else:
                provider_name = provider.first_name or provider.username
                _notify_user(
                    provider,
                    title=notify_title,
                    body=provider_body,
                    related_model='RefundRequest',
                    related_object_id=refund_request.id,
                    alert_type=f"refund_{action}",
                    event_key=f"refund-{action}:{refund_request.id}:provider",
                )

                _safe_send_mail(
                    subject=f"Refund Update For Booking #{booking.id if booking else 'N/A'}",
                    plain_message=(
                        f"Hi {provider_name},\n\n"
                        f"{provider_body}\n"
                        f"Refund ID: {refund_request.id}\n"
                        f"Booking ID: {booking.id if booking else 'N/A'}\n"
                        f"Booking: {_booking_label(booking)}\n"
                        f"Status: {str(refund_request.status).replace('_', ' ').title()}\n"
                        f"Approved Amount: {final_amount}"
                        f"{admin_notes_line}\n"
                    ),
                    recipient_list=[provider.email] if provider.email else [],
                    html_message=_build_refund_email_html(
                        heading='LocaLynk Provider Refund Notice',
                        subheading='Refund Status Update',
                        recipient_name=provider_name,
                        intro_message=provider_body,
                        detail_rows=[
                            ('Refund ID', f"#{refund_request.id}"),
                            ('Booking ID', f"#{booking.id if booking else 'N/A'}"),
                            ('Booking', _booking_label(booking)),
                            ('Requested Amount', _format_php(refund_request.requested_amount)),
                            ('Approved Amount', _format_php(final_amount)),
                            ('Status', str(refund_request.status).replace('_', ' ').title()),
                        ],
                        status_label=str(refund_request.status).replace('_', ' ').title(),
                        notes=refund_request.admin_notes,
                        accent_color=_refund_status_color(refund_request.status),
                    ),
                )

        _safe_send_mail(
            subject=f"LocaLynk Refund Update - #{refund_request.id}",
            plain_message=(
                f"Hi {refund_request.requested_by.first_name or refund_request.requested_by.username},\n\n"
                f"{tourist_body}\n"
                f"Status: {refund_request.status}\n"
                f"Booking ID: {booking.id if booking else 'N/A'}\n"
                f"Approved Amount: {refund_request.approved_amount if refund_request.approved_amount is not None else 'Pending'}"
                f"{admin_notes_line}\n"
            ),
            recipient_list=[refund_request.requested_by.email] if refund_request.requested_by.email else [],
            html_message=_build_refund_email_html(
                heading='LocaLynk Refund Center',
                subheading='Refund Request Update',
                recipient_name=refund_request.requested_by.first_name or refund_request.requested_by.username,
                intro_message=tourist_body,
                detail_rows=[
                    ('Refund ID', f"#{refund_request.id}"),
                    ('Booking ID', f"#{booking.id if booking else 'N/A'}"),
                    ('Requested Amount', _format_php(refund_request.requested_amount)),
                    ('Approved Amount', _format_php(refund_request.approved_amount) if refund_request.approved_amount is not None else 'Pending'),
                    ('Status', str(refund_request.status).replace('_', ' ').title()),
                ],
                status_label=str(refund_request.status).replace('_', ' ').title(),
                notes=refund_request.admin_notes,
                accent_color=_refund_status_color(refund_request.status),
            ),
        )

        response_serializer = RefundRequestSerializer(refund_request, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_200_OK)