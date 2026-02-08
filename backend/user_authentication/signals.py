from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()

@receiver(pre_save, sender=User)
def track_approval_status(sender, instance, **kwargs):
    """
    Stores the previous approval status on the instance before it is saved.
    """
    if instance.pk:
        try:
            old_instance = User.objects.get(pk=instance.pk)
            instance._was_approved = old_instance.guide_approved
        except User.DoesNotExist:
            instance._was_approved = False
    else:
        instance._was_approved = False

@receiver(post_save, sender=User)
def notify_guide_approval(sender, instance, created, **kwargs):
    """
    Sends an email ONLY when guide_approved changes from False to True.
    """
    was_approved = getattr(instance, '_was_approved', False)
    
    # Check if the status just flipped to True
    if not created and instance.guide_approved and not was_approved:
        send_mail(
            subject="Your Guide Application is Approved!",
            message=(
                f"Dear {instance.username},\n\n"
                f"We are happy to inform you that your application to become an individual Local Guide on LocaLynk has been approved.\n\n"
                f"You can now log in to manage your profile and start accepting bookings from tourists.\n\n"
                f"Thank you for joining our community!\n\n"
                f"Best regards,\n"
                f"The LocaLynk Admin Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instance.email],
            fail_silently=True,
        )