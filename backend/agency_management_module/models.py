from django.db import models #type: ignore
from django.conf import settings
from django.core.exceptions import ValidationError #type: ignore

User = settings.AUTH_USER_MODEL

class Agency(models.Model):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    )

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agency_profile', null=True, blank=True)
    
    business_name = models.CharField(max_length=255)
    owner_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    business_license = models.FileField(upload_to="agency/licenses/", null=True, blank=True)
    
    # NEW: Logo field added here
    logo = models.ImageField(upload_to="agency/logos/", null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    
    created_at = models.DateTimeField(auto_now_add=True)
    down_payment_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=30.00, help_text="Required downpayment percentage (e.g., 30 for 30%)")

    def __str__(self):
        return f"{self.business_name} ({self.status})"

class TouristGuide(models.Model):
    agency = models.ForeignKey(Agency, on_delete=models.CASCADE, related_name="tourist_guides")
    
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    email = models.EmailField(blank=True, null=True)
    contact_number = models.CharField(max_length=20)
    profile_picture = models.ImageField(upload_to="agency/guides/profiles/", blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    specialization = models.CharField(max_length=255, blank=True, null=True)
    languages = models.JSONField(default=list, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    def __str__(self):
        return self.full_name()