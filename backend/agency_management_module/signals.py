from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from .models import Agency, TouristGuide
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model 
from system_management_module.services.push_notifications import send_push_to_user, build_alert_push_data

User = get_user_model() 

# Add a pre_save signal to remember the old status before saving
@receiver(pre_save, sender=Agency)
def capture_old_status(sender, instance, **kwargs):
    if instance.pk:
        try:
            # Look up what the status was BEFORE this save
            old_instance = Agency.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Agency.DoesNotExist:
            instance._old_status = None
    else:
        # This is a brand new agency being created
        instance._old_status = None

@receiver(post_save, sender=Agency)
def sync_guides_with_agency_approval(sender, instance, created, **kwargs):
    
    # Use the new 'status' field instead of 'is_approved'
    if instance.status != 'Approved':
        TouristGuide.objects.filter(agency=instance).update(is_active=False)
    else:
        TouristGuide.objects.filter(agency=instance).update(is_active=True)
        
        # Give the owner staff access
        if instance.user and not instance.user.is_staff:
            user_account = instance.user
            user_account.is_staff = True
            user_account.save(update_fields=['is_staff']) 
            
        # ONLY send the email if the status JUST changed to Approved
        old_status = getattr(instance, '_old_status', None)
        
        if instance.status == 'Approved' and old_status != 'Approved':
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

            if instance.user:
                send_push_to_user(
                    user=instance.user,
                    title='Agency Approved',
                    body='Your agency account is now approved. You can start managing guides and bookings.',
                    data=build_alert_push_data(
                        alert_type='agency_approved',
                        related_model='Agency',
                        related_object_id=instance.id,
                    ),
                    event_key=f"agency-approved:{instance.id}",
                )