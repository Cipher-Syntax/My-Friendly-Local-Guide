from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.
class User(AbstractUser):
    is_tourist = models.BooleanField(default=True)
    is_local_guide = models.BooleanField(default=False)
    guide_approved = models.BooleanField(default=False)
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    phone_number =  models.CharField(max_length=20, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)

    def apply_as_guide(self):
        if not self.is_local_guide:
            self.is_local_guide = True
            self.guide_approved = False
            self.save()