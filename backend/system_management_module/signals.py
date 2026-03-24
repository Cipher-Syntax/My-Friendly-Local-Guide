from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from .models import SystemAlert
from .services.push_notifications import send_push_to_user, build_alert_push_data

try:
    from payment.models import Booking
except ImportError:
    from accommodation_booking.models import Booking

from communication.models import Message 


def _display_name_for_user(user):
    full_name = (user.get_full_name() or '').strip()
    if full_name:
        return full_name

    username = (getattr(user, 'username', '') or '').strip()
    if '@' in username:
        local = username.split('@', 1)[0].replace('.', ' ').replace('_', ' ').replace('-', ' ').strip()
        if local:
            return ' '.join(part.capitalize() for part in local.split())

    return username or 'User'

@receiver(post_save, sender=Message)
def create_alert_for_new_message(sender, instance, created, **kwargs):
   
    if created:
        receiver = instance.receiver
        receiver_role = 'Guide' if getattr(receiver, 'is_local_guide', False) else 'Tourist'

        sender_name = _display_name_for_user(instance.sender)
        unread_from_sender = Message.objects.filter(
            sender=instance.sender,
            receiver=receiver,
            is_read=False,
        ).count()

        if unread_from_sender > 1:
            alert_message = f"You have {unread_from_sender} new messages from {sender_name}"
        else:
            alert_message = f"You received a message from {sender_name}"

        # Keep one unread "New Message" alert per sender to avoid notification spam.
        existing_alert = None
        candidate_alerts = SystemAlert.objects.filter(
            recipient=receiver,
            title="New Message",
            related_model='Message',
            is_read=False,
        ).order_by('-created_at')[:50]

        for alert in candidate_alerts:
            if not alert.related_object_id:
                continue
            related_message = Message.objects.filter(pk=alert.related_object_id).only('sender_id').first()
            if related_message and related_message.sender_id == instance.sender_id:
                existing_alert = alert
                break

        if existing_alert:
            existing_alert.message = alert_message
            existing_alert.related_object_id = instance.id
            existing_alert.save(update_fields=['message', 'related_object_id'])
        else:
            SystemAlert.objects.create(
                target_type=receiver_role,
                recipient=receiver,
                title="New Message",
                message=alert_message,
                related_model='Message',
                related_object_id=instance.id
            )

        send_push_to_user(
            user=receiver,
            title='New Message',
            body=alert_message,
            data=build_alert_push_data(
                alert_type='new_message',
                related_model='Message',
                related_object_id=instance.id,
                extra={
                    'partner_id': instance.sender.id,
                    'partner_name': _display_name_for_user(instance.sender),
                },
            ),
            event_key=f"message:{instance.id}",
        )

@receiver(pre_save, sender=Booking)
def cache_previous_booking_status(sender, instance, **kwargs):
    if not instance.pk:
        instance._previous_status = None
        return
    try:
        previous = sender.objects.get(pk=instance.pk)
        instance._previous_status = previous.status
    except sender.DoesNotExist:
        instance._previous_status = None

@receiver(post_save, sender=Booking)
def create_alert_for_booking_status(sender, instance, created, **kwargs):

    if not created:
        previous_status = getattr(instance, '_previous_status', None)
        if previous_status == instance.status:
            return

        if instance.status == 'Accepted':
            
            provider_name = "your guide"
            if instance.guide:
                provider_name = instance.guide.get_full_name() or instance.guide.username
            elif instance.accommodation:
                provider_name = instance.accommodation.title

            SystemAlert.objects.create(
                target_type='Tourist',
                recipient=instance.tourist,
                title="Booking Accepted!",
                message=f"Great news! {provider_name} has accepted your booking request. You can now proceed to payment.",
                related_model='Booking',
                related_object_id=instance.id
            )

            send_push_to_user(
                user=instance.tourist,
                title='Booking Accepted!',
                body=f"{provider_name} accepted your booking request.",
                data=build_alert_push_data(
                    alert_type='booking_accepted',
                    related_model='Booking',
                    related_object_id=instance.id,
                ),
                event_key=f"booking-status:{instance.id}:accepted",
            )

        elif instance.status == 'Declined':
             SystemAlert.objects.create(
                target_type='Tourist',
                recipient=instance.tourist,
                title="Booking Declined",
                message=f"Unfortunately, your booking request was declined. Please try finding another guide or date.",
                related_model='Booking',
                related_object_id=instance.id
            )

             send_push_to_user(
                user=instance.tourist,
                title='Booking Declined',
                body='Your booking request was declined. Please try another provider or schedule.',
                data=build_alert_push_data(
                    alert_type='booking_declined',
                    related_model='Booking',
                    related_object_id=instance.id,
                ),
                event_key=f"booking-status:{instance.id}:declined",
            )