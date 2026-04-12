from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.conf import settings
from django.core.exceptions import ObjectDoesNotExist
from .models import SystemAlert
from .services.push_notifications import send_push_to_user, build_alert_push_data
from .services.email_preferences import send_preference_aware_email

try:
    from payment.models import Booking
except ImportError:
    from accommodation_booking.models import Booking

from communication.models import Message 


def _display_name_for_user(user):
    try:
        agency_profile = user.agency_profile
        business_name = (getattr(agency_profile, 'business_name', '') or '').strip()
        if business_name:
            return business_name
    except (AttributeError, ObjectDoesNotExist):
        pass

    full_name = (user.get_full_name() or '').strip()
    if full_name:
        return full_name

    username = (getattr(user, 'username', '') or '').strip()
    if '@' in username:
        local = username.split('@', 1)[0].replace('.', ' ').replace('_', ' ').replace('-', ' ').strip()
        if local:
            return ' '.join(part.capitalize() for part in local.split())

    return username or 'User'


def _format_booking_dates(check_in, check_out):
    if not check_in:
        return 'N/A'

    if not check_out or check_in == check_out:
        return check_in.strftime('%B %d, %Y')

    return f"{check_in.strftime('%B %d, %Y')} to {check_out.strftime('%B %d, %Y')}"

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
            if instance.agency:
                agency_profile = getattr(instance.agency, 'agency_profile', None)
                provider_name = (
                    getattr(agency_profile, 'business_name', None)
                    or _display_name_for_user(instance.agency)
                )
            elif instance.guide:
                provider_name = _display_name_for_user(instance.guide)
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

            tourist = instance.tourist
            if tourist and tourist.email:
                tourist_name = _display_name_for_user(tourist)
                destination_name = getattr(instance.destination, 'name', None) or str(instance.destination or 'Your selected destination')
                booking_dates = _format_booking_dates(instance.check_in, instance.check_out)
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')

                plain_message = (
                    f"Hi {tourist_name},\n\n"
                    f"Great news! {provider_name} has accepted your booking request.\n\n"
                    "Booking details:\n"
                    f"- Destination: {destination_name}\n"
                    f"- Dates: {booking_dates}\n"
                    f"- Booking ID: #{instance.id}\n\n"
                    "You can now proceed to payment in the LocaLynk app.\n"
                    f"If you're on web, sign in here: {frontend_url}/login\n\n"
                    "Thank you for choosing LocaLynk!"
                )

                html_message = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }}
                        .header {{ background-color: #10b981; padding: 30px 20px; text-align: center; color: #ffffff; font-size: 24px; font-weight: bold; }}
                        .content {{ padding: 30px; line-height: 1.6; font-size: 16px; color: #475569; }}
                        .details-box {{ background-color: #f1f5f9; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0; }}
                        .btn {{ display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 16px; text-align: center; }}
                        .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">Booking Accepted</div>
                        <div class="content">
                            <p>Hi {tourist_name},</p>
                            <p>Great news! <strong>{provider_name}</strong> has accepted your booking request.</p>

                            <div class="details-box">
                                <p style="margin: 6px 0;"><strong>Destination:</strong> {destination_name}</p>
                                <p style="margin: 6px 0;"><strong>Dates:</strong> {booking_dates}</p>
                                <p style="margin: 6px 0;"><strong>Booking ID:</strong> #{instance.id}</p>
                            </div>

                            <p>You can now proceed to payment in the LocaLynk app.</p>
                        </div>
                        <div class="footer">&copy; 2026 LocaLynk. All rights reserved.</div>
                    </div>
                </body>
                </html>
                """

                send_preference_aware_email(
                    subject='Booking Accepted - Proceed to Payment',
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[tourist.email],
                    fail_silently=True,
                    html_message=html_message,
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