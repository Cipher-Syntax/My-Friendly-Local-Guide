from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from system_management_module.services.email_preferences import send_preference_aware_email

User = get_user_model()

class SystemAlert(models.Model):
    TARGET_CHOICES = [
        ('Tourist', 'Tourist'),
        ('Guide', 'Local Guide'),
        ('Admin', 'Administrator'),
    ]
    
    target_type = models.CharField(max_length=20, choices=TARGET_CHOICES) 
    
    recipient = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='system_alerts',
        help_text="If set, this alert is only for this specific user."
    )
    
    title = models.CharField(max_length=150)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    related_object_id = models.IntegerField(null=True, blank=True)
    related_model = models.CharField(max_length=50, null=True, blank=True)
    
    def __str__(self):
        return f"Alert: {self.title}"

class GuideReviewRequest(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending Review'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]
    
    applicant = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='guide_review_request',
        help_text="The user requesting guide status."
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    submission_date = models.DateTimeField(auto_now_add=True)
    admin_notes = models.TextField(blank=True, null=True)
    
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='guide_reviews_handled',
    )
    
    def __str__(self):
        return f"Guide Review: {self.applicant.username} - {self.status}"

    def save(self, *args, **kwargs):
        if self.pk:
            try:
                previous = GuideReviewRequest.objects.get(pk=self.pk)
                previous_status = previous.status
            except GuideReviewRequest.DoesNotExist:
                previous_status = None
        else:
            previous_status = None

        is_new = self._state.adding
        super().save(*args, **kwargs)

        if not is_new and self.status != previous_status:
            
            if self.status == 'Approved':
                SystemAlert.objects.create(
                    target_type='Guide',
                    recipient=self.applicant,
                    title="Application Approved!",
                    message="Your guide application has been fully approved. You can now accept bookings.",
                    related_model='GuideReviewRequest',
                    related_object_id=self.pk
                )
                try:
                    send_preference_aware_email(
                        subject="LocaLynk: Application Approved!",
                        message=f"Congratulations {self.applicant.first_name}!\n\nYour application to become a Local Guide has been approved. Log in to start accepting bookings.",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[self.applicant.email],
                        fail_silently=True
                    )
                except Exception as e:
                    print(f"Email failed (Approved): {e}")

            elif self.status == 'Rejected':
                SystemAlert.objects.create(
                    target_type='Tourist',
                    recipient=self.applicant,
                    title="Warning from Admin",
                    message=f"Application Rejected: {self.admin_notes or 'Verification failed.'}",
                    related_model='GuideReviewRequest',
                    related_object_id=self.pk
                )
                try:
                    send_preference_aware_email(
                        subject="LocaLynk: Application Status Update",
                        message=f"Hello {self.applicant.first_name},\n\nYour application was not approved.\nReason: {self.admin_notes or 'Verification failed'}.\nPlease update your profile/documents and try again.",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[self.applicant.email],
                        fail_silently=True
                    )
                except Exception as e:
                    print(f"Email failed (Rejected): {e}")
        
        elif is_new:
            SystemAlert.objects.create(
                target_type='Tourist',
                recipient=self.applicant,
                title="Application Submitted",
                message="Your guide application has been submitted and is waiting for admin review.",
                related_model='GuideReviewRequest',
                related_object_id=self.pk
            )


class PushDeviceToken(models.Model):
    PLATFORM_CHOICES = [
        ('ios', 'iOS'),
        ('android', 'Android'),
        ('web', 'Web'),
        ('unknown', 'Unknown'),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='push_device_tokens'
    )
    expo_push_token = models.CharField(max_length=255, unique=True, db_index=True)
    device_id = models.CharField(max_length=128, blank=True, null=True)
    platform = models.CharField(max_length=20, choices=PLATFORM_CHOICES, default='unknown')
    app_version = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} - {self.platform} - {self.expo_push_token[:20]}..."


class PushNotificationDeliveryLog(models.Model):
    STATUS_CHOICES = [
        ('queued', 'Queued'),
        ('retrying', 'Retrying'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('dropped', 'Dropped'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    device_token = models.ForeignKey(PushDeviceToken, on_delete=models.SET_NULL, null=True, blank=True)
    event_key = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    title = models.CharField(max_length=150)
    body = models.TextField()
    data = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='queued')
    attempts = models.PositiveSmallIntegerField(default=0)
    expo_ticket_id = models.CharField(max_length=255, blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    response_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PushLog<{self.id}> {self.status} - {self.title}"