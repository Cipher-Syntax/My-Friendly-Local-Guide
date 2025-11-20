from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SystemAlert

# Adjust this import based on where your Booking model actually lives.
# Based on your previous files, it seems to be in the 'payment' app.
try:
    from payment.models import Booking
except ImportError:
    # Fallback if it's in the other app
    from accommodation_booking.models import Booking

from communication.models import Message 

# --- Existing Message Signal ---
@receiver(post_save, sender=Message)
def create_alert_for_new_message(sender, instance, created, **kwargs):
    """
    When a new Message is created, automatically create a SystemAlert 
    for the receiver.
    """
    if created:
        SystemAlert.objects.create(
            target_type='Tourist', 
            recipient=instance.receiver,
            title="New Message",
            message=f"You received a message from {instance.sender.username}",
            related_model='Message',
            related_object_id=instance.id
        )

# --- NEW: Booking Status Signal ---
@receiver(post_save, sender=Booking)
def create_alert_for_booking_status(sender, instance, created, **kwargs):
    """
    Triggers when a Booking is saved. Checks if status changed to 'Accepted'.
    """
    if not created:
        # We only care about updates (status changes), not initial creation
        if instance.status == 'Accepted':
            
            # Determine the service provider's name for the message
            provider_name = "your guide"
            if instance.guide:
                provider_name = instance.guide.get_full_name() or instance.guide.username
            elif instance.accommodation:
                provider_name = instance.accommodation.title

            # Create the alert for the Tourist
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