from django.db import models #type: ignore
from django.conf import settings 
from django.core.exceptions import ValidationError #type: ignore

from backend.location_policy import validate_zds_location_payload

User = settings.AUTH_USER_MODEL 


class DestinationCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name

class Destination(models.Model):
    CATEGORY_CHOICES = [
        ('Cultural', 'Cultural'),
        ('Historical', 'Historical'),
        ('Adventure', 'Adventure'),
        ('Nature', 'Nature'),
        ('Beaches', 'Beaches'),
        ('Mountains', 'Mountains'),
        ('Rivers', 'Rivers'),
        ('Islands', 'Islands'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    location = models.CharField(max_length=255)
    municipality = models.CharField(max_length=120, blank=True, null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    is_featured = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def _apply_location_policy(self):
        normalized = validate_zds_location_payload(
            location=self.location,
            latitude=self.latitude,
            longitude=self.longitude,
            municipality=self.municipality,
            require_location=True,
        )

        self.location = normalized['location']
        self.latitude = normalized['latitude']
        self.longitude = normalized['longitude']
        self.municipality = normalized['municipality'] or None

    def save(self, *args, **kwargs):
        self._apply_location_policy()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

class DestinationImage(models.Model):
    destination = models.ForeignKey(Destination, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='destination_images/')
    caption = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Image for {self.destination.name}"

class Attraction(models.Model):
    destination = models.ForeignKey(Destination, related_name='attractions', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField()
    photo = models.ImageField(upload_to='attractions/', blank=True, null=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.name} ({self.destination.name})"

class TourPackage(models.Model):
    # The owner can be a local guide OR an agency
    guide = models.ForeignKey(User, related_name='tours', on_delete=models.CASCADE, null=True, blank=True)
    agency = models.ForeignKey('agency_management_module.Agency', related_name='tour_packages', on_delete=models.CASCADE, null=True, blank=True)
    
    main_destination = models.ForeignKey(Destination, related_name='tour_packages', on_delete=models.SET_NULL, null=True, blank=True)
    
    name = models.CharField(max_length=255)
    description = models.TextField()
    
    duration = models.CharField(max_length=100)
    duration_days = models.PositiveIntegerField(default=1) 
    max_group_size = models.PositiveIntegerField()
    what_to_bring = models.TextField(blank=True, null=True)
    
    price_per_day = models.DecimalField(max_digits=10, decimal_places=2)
    solo_price = models.DecimalField(max_digits=10, decimal_places=2)
    additional_fee_per_head = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    itinerary_timeline = models.JSONField(default=list, blank=True) 

    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def clean(self):
        """Ensures the package belongs to exactly one owner type."""
        if not self.guide and not self.agency:
            raise ValidationError("A Tour Package must belong to either a guide or an agency.")
        if self.guide and self.agency:
            raise ValidationError("A Tour Package cannot belong to both a guide and an agency.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        owner = self.agency.business_name if self.agency else self.guide.username
        return f"{self.name} by {owner}"

class TourStop(models.Model):
    tour = models.ForeignKey(TourPackage, related_name='stops', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to='tour_stops/')
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.name} in {self.tour.name}"


class LocationCorrectionRequest(models.Model):
    TARGET_TYPE_CHOICES = [
        ('destination', 'Destination'),
        ('accommodation', 'Accommodation'),
        ('booking_meetup', 'Booking Meetup'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    submitted_by = models.ForeignKey(
        User,
        related_name='location_corrections_submitted',
        on_delete=models.CASCADE,
    )
    target_type = models.CharField(max_length=30, choices=TARGET_TYPE_CHOICES)

    destination = models.ForeignKey(
        Destination,
        related_name='location_corrections',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    accommodation = models.ForeignKey(
        'accommodation_booking.Accommodation',
        related_name='location_corrections',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )
    booking = models.ForeignKey(
        'accommodation_booking.Booking',
        related_name='meetup_location_corrections',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
    )

    current_location = models.CharField(max_length=255, blank=True, default='')
    current_municipality = models.CharField(max_length=120, blank=True, default='')
    current_latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    current_longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)

    proposed_location = models.CharField(max_length=255)
    proposed_municipality = models.CharField(max_length=120, blank=True, default='')
    proposed_latitude = models.DecimalField(max_digits=9, decimal_places=6)
    proposed_longitude = models.DecimalField(max_digits=9, decimal_places=6)
    reason = models.TextField(blank=True, default='')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(
        User,
        related_name='location_corrections_reviewed',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
    )
    reviewed_at = models.DateTimeField(blank=True, null=True)
    review_note = models.TextField(blank=True, default='')
    applied_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        super().clean()

        target_map = {
            'destination': bool(self.destination_id),
            'accommodation': bool(self.accommodation_id),
            'booking_meetup': bool(self.booking_id),
        }

        active_targets = [key for key, enabled in target_map.items() if enabled]
        if len(active_targets) != 1:
            raise ValidationError('Exactly one correction target must be selected.')

        if self.target_type not in target_map:
            raise ValidationError({'target_type': 'Unsupported correction target type.'})

        if not target_map[self.target_type]:
            raise ValidationError({'target_type': 'Target type does not match selected correction target.'})

        normalized = validate_zds_location_payload(
            location=self.proposed_location,
            latitude=self.proposed_latitude,
            longitude=self.proposed_longitude,
            municipality=self.proposed_municipality,
            require_location=True,
            require_coordinates=True,
        )

        self.proposed_location = normalized['location']
        self.proposed_latitude = normalized['latitude']
        self.proposed_longitude = normalized['longitude']
        self.proposed_municipality = normalized['municipality'] or ''

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Location correction #{self.id} ({self.target_type})"