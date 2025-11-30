from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SystemAlert

try:
    from payment.models import Booking
except ImportError:
    from accommodation_booking.models import Booking

from communication.models import Message 

@receiver(post_save, sender=Message)
def create_alert_for_new_message(sender, instance, created, **kwargs):
   
    if created:
        SystemAlert.objects.create(
            target_type='Tourist', 
            recipient=instance.receiver,
            title="New Message",
            message=f"You received a message from {instance.sender.username}",
            related_model='Message',
            related_object_id=instance.id
        )

@receiver(post_save, sender=Booking)
def create_alert_for_booking_status(sender, instance, created, **kwargs):

    if not created:
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

        elif instance.status == 'Declined':
             SystemAlert.objects.create(
                target_type='Tourist',
                recipient=instance.tourist,
                title="Booking Declined",
                message=f"Unfortunately, your booking request was declined. Please try finding another guide or date.",
                related_model='Booking',
                related_object_id=instance.id
            )