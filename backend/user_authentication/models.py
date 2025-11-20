from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.postgres.fields import JSONField # Import for languages

# Create your models here.
from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    # --- Existing Roles ---
    is_tourist = models.BooleanField(default=True)
    is_local_guide = models.BooleanField(default=False)
    guide_approved = models.BooleanField(default=False)

    # --- General Profile Details ---
    profile_picture = models.ImageField(upload_to='profiles/', blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True, help_text="e.g., City, Province")
    
    # --- Guide Specific Details ---
    guide_rating = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        default=0.0,
        blank=True, 
        null=True,
        help_text="Average rating out of 5.0"
    )
    experience_years = models.IntegerField(default=0, blank=True, null=True)
    
    # --- NEW FIELDS: Availability & Itinerary ---
    # Stores days like: ["Mon", "Wed", "Fri"] or ["All"]
    available_days = models.JSONField(
        default=list, 
        blank=True, 
        help_text="List of days guide is available, e.g., ['Mon', 'Wed', 'Fri']"
    )
    specific_available_dates = models.JSONField(
        default=list,
        blank=True,
        help_text="List of specific dates guide is available, e.g., ['2025-12-25', '2026-01-01']"
    )

    # Stores the textual description of their tour plan
    tour_itinerary = models.TextField(
        blank=True, 
        null=True, 
        help_text="Standard itinerary description for the guide's tour."
    )

    # --- Pricing Details ---
    # price_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=500.00, help_text="Base guide price (₱ 500/day)")
    price_per_day = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00,
        null=True,  # Allows it to be empty for tourists
        blank=True
    )
    solo_price_per_day = models.DecimalField(max_digits=10, decimal_places=2, default=1500.00, help_text="Solo tourist price")
    multiple_additional_fee_per_head = models.DecimalField(max_digits=10, decimal_places=2, default=100.00, help_text="Additional fee per head for groups")
    
    # List of languages spoken (e.g., ['English', 'Tagalog'])
    languages = models.JSONField(default=list, blank=True) 
    specialty = models.CharField(max_length=100, blank=True, null=True)

    def apply_as_guide(self):
        """Sets user as a local guide pending admin approval."""
        if not self.is_local_guide:
            self.is_local_guide = True
            self.guide_approved = False
            self.save()
            
    def __str__(self):
        return self.username


# --- Guide Application Documents Model ---

class GuideApplication(models.Model):
    """
    Holds temporary data and documents required for a user to apply as a Local Guide.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='guide_application',
        help_text="The user associated with this guide application."
    )

    # Document Fields (FileField for uploads)
    tour_guide_certificate = models.FileField(upload_to='guide_docs/certs/', blank=True, null=True)
    proof_of_residency = models.FileField(upload_to='guide_docs/residency/', blank=True, null=True)
    valid_id = models.FileField(upload_to='guide_docs/id/', blank=True, null=True)
    nbi_clearance = models.FileField(upload_to='guide_docs/nbi/', blank=True, null=True)

    # Application Status
    submission_date = models.DateTimeField(auto_now_add=True)
    is_reviewed = models.BooleanField(default=False)
    review_notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Application for {self.user.username}"


# --- Accessory Models (If they reside here) ---

class FeaturedPlace(models.Model):
    """Example of a model linked to User, kept for serializer structure."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='featured_places_user')
    image = models.ImageField(upload_to='featured_places_user/')

class AccommodationImage(models.Model):
    """Example of a model linked to User, kept for serializer structure."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='accommodation_images_user')
    image = models.ImageField(upload_to='accommodation_images_user/')