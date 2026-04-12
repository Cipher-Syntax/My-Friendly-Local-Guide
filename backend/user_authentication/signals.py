from django.db.models.signals import pre_save, post_save, post_delete #type: ignore
from django.dispatch import receiver #type: ignore
from django.conf import settings
from django.contrib.auth import get_user_model
from system_management_module.services.push_notifications import send_push_to_user, build_alert_push_data
from system_management_module.services.email_preferences import send_preference_aware_email
from .models import GuideApplication

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
    
    if not created and instance.guide_approved and not was_approved:
        plain_message = (
            f"Dear {instance.username},\n\n"
            f"We are happy to inform you that your application to become an individual Local Guide on LocaLynk has been approved.\n\n"
            f"You can now log in to manage your profile and start accepting bookings from tourists.\n\n"
            f"Thank you for joining our community!\n\n"
            f"Best regards,\n"
            f"The LocaLynk Admin Team"
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
                .btn {{ display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; text-align: center; }}
                .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">Application Approved!</div>
                <div class="content">
                    <h2 style="color: #333; margin-top: 0;">Congratulations, {instance.username}!</h2>
                    <p>We are thrilled to inform you that your application to become an individual Local Guide on LocaLynk has been fully approved.</p>
                    <p>You can now log in to manage your guide profile, set your availability, and start accepting bookings from tourists exploring the city.</p>
                    <div style="text-align: center;">
                        <a href="{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/login" class="btn">Go to Dashboard</a>
                    </div>
                    <p style="margin-top: 30px;">Thank you for joining our community!</p>
                </div>
                <div class="footer">&copy; 2026 LocaLynk. All rights reserved.</div>
            </div>
        </body>
        </html>
        """

        send_preference_aware_email(
            subject="Your Guide Application is Approved!",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[instance.email],
            fail_silently=True,
            html_message=html_message
        )

        send_push_to_user(
            user=instance,
            title='Application Approved!',
            body='Your guide application has been approved. You can now accept bookings.',
            data=build_alert_push_data(
                alert_type='guide_approved',
                related_model='User',
                related_object_id=instance.id,
            ),
            event_key=f"guide-approved:{instance.id}",
        )

@receiver(post_delete, sender=GuideApplication)
def revert_user_role_on_application_deletion(sender, instance, **kwargs):
    """
    If a guide application is deleted (e.g., rejected by admin), 
    revert the user's is_local_guide status so the frontend goes back to Action.js.
    """
    user = instance.user
    
    # Only revert if they haven't been fully approved
    if user.is_local_guide and not user.guide_approved:
        user.is_local_guide = False
        user.save()