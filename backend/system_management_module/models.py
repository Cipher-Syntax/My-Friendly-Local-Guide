from django.db import models
from user_authentication.models import User
from accommodation_booking.models import Booking # Assuming this is accessible

# --- 1. System Alert Model (General Notifications) ---

class SystemAlert(models.Model):
    """
    General purpose alerts or notifications for users.
    (e.g., 'Your booking status changed', 'Payment confirmed')
    """
    TARGET_CHOICES = [
        ('Tourist', 'Tourist'),
        ('Guide', 'Local Guide'),
        ('Admin', 'Administrator'),
    ]
    
    # We use CharField for target_type since one alert might go to many people of that type
    target_type = models.CharField(max_length=20, choices=TARGET_CHOICES) 
    
    # Optional: Link to a specific user if the alert is personalized
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
    
    # Optional: Link to an external object like a Booking if relevant
    related_object_id = models.IntegerField(null=True, blank=True)
    related_model = models.CharField(max_length=50, null=True, blank=True)
    
    def __str__(self):
        return f"Alert: {self.title} for {self.recipient.username if self.recipient else self.target_type}"

# --- 2. Guide Application Review Model (Admin Action Item) ---

class GuideReviewRequest(models.Model):
    """
    A persistent record and queue item for Admin to review a new Guide Application.
    This links directly to the pending GuideApplication object.
    """
    STATUS_CHOICES = [
        ('Pending', 'Pending Review'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]
    
    # Links to the User who submitted the GuideApplication
    applicant = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='guide_review_request',
        help_text="The user requesting guide status."
    )
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    submission_date = models.DateTimeField(auto_now_add=True)
    admin_notes = models.TextField(blank=True, null=True)
    
    # The Admin user who took action on the request
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
        is_new = self._state.adding
        super().save(*args, **kwargs)

        if not is_new and self.status == 'Approved' and self.applicant.is_local_guide:
            # Trigger System Alert for the applicant upon final review approval
            SystemAlert.objects.create(
                target_type='Guide',
                recipient=self.applicant,
                title="Application Approved!",
                message="Your guide application has been fully approved. Please complete the registration fee payment.",
                related_model='GuideReviewRequest',
                related_object_id=self.pk
            )
            # You would typically also fire an email or push notification here.
        elif is_new:
            # Trigger System Alert for the Admin when a new request comes in
            SystemAlert.objects.create(
                target_type='Admin',
                title="New Guide Application",
                message=f"New application submitted by {self.applicant.username}. Review required.",
                related_model='GuideReviewRequest',
                related_object_id=self.pk
            )