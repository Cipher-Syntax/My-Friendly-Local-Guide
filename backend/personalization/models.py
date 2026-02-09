from django.db import models
from user_authentication.models import User
from django.db.models import JSONField
from destinations_and_attractions.models import Destination

class Personalization(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='personalization_profile')
    
    preferred_location = models.CharField(max_length=255, blank=True, null=True, help_text="e.g., City or region for next trip")
    
    # New field: Store specific destinations selected by the user
    preferred_destinations = models.ManyToManyField(
        Destination, 
        blank=True, 
        related_name='interested_users'
    )
    
    travel_categories = JSONField(blank=True, null=True)
    
    onboarding_completed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.user.username}"