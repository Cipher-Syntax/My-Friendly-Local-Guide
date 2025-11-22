from django.db import models
from user_authentication.models import User
# from accommodation_booking.models import Booking # Uncomment if needed

# --- 1. System Alert Model (General Notifications) ---

class SystemAlert(models.Model):
    """
    General purpose alerts or notifications for users.
    """
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
        return f"Alert: {self.title} for {self.recipient.username if self.recipient else self.target_type}"

# --- 2. Guide Application Review Model (Admin Action Item) ---

class GuideReviewRequest(models.Model):
    """
    A persistent record and queue item for Admin to review a new Guide Application.
    """
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
        # 1. Capture previous state to detect status changes
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

        # --- SCENARIO A: APPROVED ---
        if not is_new and self.status == 'Approved' and self.applicant.is_local_guide:
            SystemAlert.objects.create(
                target_type='Guide',
                recipient=self.applicant,
                title="Application Approved!",
                message="Your guide application has been fully approved. Please complete the registration fee payment.",
                related_model='GuideReviewRequest',
                related_object_id=self.pk
            )

        # --- SCENARIO B: REJECTED (This triggers 'Warning from Admin') ---
        elif not is_new and self.status == 'Rejected' and previous_status != 'Rejected':
            SystemAlert.objects.create(
                target_type='Tourist',
                recipient=self.applicant,
                title="Warning from Admin",  # Matches Frontend Key
                message=f"Application Rejected: {self.admin_notes or 'Verification failed. Please check your documents.'}",
                related_model='GuideReviewRequest',
                related_object_id=self.pk
            )

        # --- SCENARIO C: NEW SUBMISSION ---
        elif is_new:
            # Alert for Admin
            SystemAlert.objects.create(
                target_type='Admin',
                title="New Guide Application",
                message=f"New application submitted by {self.applicant.username}. Review required.",
                related_model='GuideReviewRequest',
                related_object_id=self.pk
            )
            # Alert for User (Waiting for Admin)
            SystemAlert.objects.create(
                target_type='Tourist',
                recipient=self.applicant,
                title="Application Submitted", # Matches Frontend Key (Added below)
                message="Your guide application has been submitted and is waiting for admin review.",
                related_model='GuideReviewRequest',
                related_object_id=self.pk
            )