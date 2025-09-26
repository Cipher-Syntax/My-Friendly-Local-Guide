from django.db import models
from user_authentication.models import User

# Create your models here.
class Personalization(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    preferred_location = models.CharField(max_length=255, blank=True, null=True)
    travel_categories = models.JSONField(blank=True, null=True)
    onboarding_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)