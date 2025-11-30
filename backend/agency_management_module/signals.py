from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Agency, TouristGuide
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model 

User = get_user_model() 


@receiver(post_save, sender=Agency)
def sync_guides_with_agency_approval(sender, instance, **kwargs):
    
    if not instance.is_approved:
        TouristGuide.objects.filter(agency=instance).update(is_active=False)
    else:
        TouristGuide.objects.filter(agency=instance).update(is_active=True)
        
        if instance.user and not instance.user.is_staff:
            user_account = instance.user
            user_account.is_staff = True
            user_account.save(update_fields=['is_staff']) 
            
        send_mail(
            subject=f"Account Approved: Welcome to the LocalYnk Agency Portal!",
            message=(
                f"Dear {instance.owner_name} ({instance.business_name}),\n\n"
                f"We are pleased to inform you that your agency application has been officially approved by the administrator.\n\n"
                f"You can now log in to the Agency Portal to manage your guides, manage bookings, and start growing your business!\n\n"
                f"Thank you for partnering with us!\n\n"
                f"Sincerely,\n"
                f"The LocaLynk Admin Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instance.email],
            fail_silently=False,
        )