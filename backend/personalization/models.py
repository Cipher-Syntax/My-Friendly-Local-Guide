from django.db import models
from user_authentication.models import User
from django.db.models import JSONField


class Personalization(models.Model):
    """Stores user preferences for recommendations and application state."""
    
    # One-to-one link to ensure every user has only one preference profile
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='personalization_profile')
    
    preferred_location = models.CharField(max_length=255, blank=True, null=True, help_text="e.g., City or region for next trip")
    
    # Stores user's interests (e.g., ['Nature', 'Historical', 'Adventure'])
    travel_categories = JSONField(blank=True, null=True)
    
    # Flag to track if the initial application/onboarding process is finished
    onboarding_completed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"