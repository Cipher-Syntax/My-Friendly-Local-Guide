from django.db import models
from django.core.exceptions import ValidationError


class Agency(models.Model):
    business_name = models.CharField(max_length=255)
    owner_name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    business_license = models.FileField(upload_to="agency/licenses/", null=True, blank=True)
    is_approved = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.business_name} ({'Approved' if self.is_approved else 'Pending'})"

class TouristGuide(models.Model):
    agency = models.ForeignKey(
        Agency,
        on_delete=models.CASCADE,
        related_name="tourist_guides",
    )

    # --- Basic Identity (REPLACING 'guide_name') ---
    first_name = models.CharField(max_length=150, blank=True, null=True)
    last_name = models.CharField(max_length=150, blank=True, null=True)
    contact_number = models.CharField(max_length=20)

    # --- Profile & Skills ---
    profile_picture = models.ImageField(upload_to="agency/guides/profiles/", blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    specialization = models.CharField(max_length=255, blank=True, null=True)
    languages = models.JSONField(default=list, blank=True)  # e.g., ["English", "Tagalog"]
    
    # --- Admin / System Fields ---
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Helper method for admin display and clean representation
    def full_name(self):
        return f"{self.first_name or ''} {self.last_name or ''}".strip()
    full_name.short_description = 'Guide Name' 

    def clean(self):
        if not self.agency.is_approved:
            raise ValidationError("Agency is not approved — cannot add tourist guides.")

    def __str__(self):
        return self.full_name()