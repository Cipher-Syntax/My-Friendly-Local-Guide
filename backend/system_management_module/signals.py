from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import SystemAlert
# Import your Message model (adjust path as necessary)
from communication.models import Message # Example path

@receiver(post_save, sender=Message)
def create_alert_for_new_message(sender, instance, created, **kwargs):
    """
    When a new Message is created, automatically create a SystemAlert 
    for the receiver.
    """
    if created:
        SystemAlert.objects.create(
            target_type='Tourist', # Or logic to detect if receiver is Guide/Tourist
            recipient=instance.receiver,
            title="New Message",
            message=f"You received a message from {instance.sender.username}",
            related_model='Message',
            related_object_id=instance.id
        )