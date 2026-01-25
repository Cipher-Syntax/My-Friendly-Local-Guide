from django.db import models
from user_authentication.models import User 
from destinations_and_attractions.models import Destination
from agency_management_module.models import TouristGuide 
from django.core.exceptions import ValidationError
from django.db.models import Q

class Accommodation(models.Model):
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name="accommodations")
    destination = models.ForeignKey(Destination, on_delete=models.SET_NULL, null=True, blank=True, related_name="accommodations")
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    photo = models.ImageField(upload_to="accommodations/")

    accommodation_type = models.CharField(max_length=100, null=True, blank=True)
    room_type = models.CharField(max_length=100, null=True, blank=True)
    amenities = models.JSONField(default=dict, null=True, blank=True)

    offer_transportation = models.BooleanField(default=False)
    vehicle_type = models.CharField(max_length=100, null=True, blank=True)
    transport_capacity = models.IntegerField(null=True, blank=True)

    room_image = models.ImageField(upload_to='accommodations/rooms/', null=True, blank=True)
    transport_image = models.ImageField(upload_to='accommodations/transport/', null=True, blank=True)

    is_approved = models.BooleanField(default=False)
    average_rating = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Booking(models.Model):
    """Represents a booking request or confirmed reservation."""
    
    # UPDATED STATUSES: Added 'Accepted' and 'Declined' back to support agency workflow
    STATUS_CHOICE = [
        ('Pending_Payment', 'Pending Payment'),
        ('Accepted', 'Accepted'), # Agency/Guide accepted the request, waiting for payment
        ('Declined', 'Declined'), # Agency/Guide rejected the request
        ('Confirmed', 'Confirmed'), # Down payment received, dates locked
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
        ('Refunded', 'Refunded'),
    ]
    
    tourist = models.ForeignKey(
        User, 
        limit_choices_to={'is_tourist': True}, 
        related_name='tourist_bookings', 
        on_delete=models.CASCADE
    )
    
    accommodation = models.ForeignKey(
        Accommodation, 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True
    )
    guide = models.ForeignKey(
        User, 
        limit_choices_to={'is_local_guide': True, 'guide_approved': True},
        related_name='guide_tours_booked',
        on_delete=models.CASCADE,
        blank=True,
        null=True
    )
    agency = models.ForeignKey(
        User,
        limit_choices_to={'is_staff': True},
        related_name='agency_bookings',
        on_delete=models.CASCADE,
        blank=True,
        null=True
    )
    destination = models.ForeignKey(
        Destination,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="bookings"
    )
    
    assigned_guides = models.ManyToManyField(
        User,
        related_name='assigned_bookings',
        blank=True,
        limit_choices_to={'is_local_guide': True, 'guide_approved': True}
    )

    assigned_agency_guides = models.ManyToManyField(
        TouristGuide,
        related_name='assigned_bookings',
        blank=True
    )

    check_in = models.DateField()
    check_out = models.DateField()
    num_guests = models.IntegerField(default=1) 
    
    # KYC Fields
    tourist_valid_id_image = models.ImageField(upload_to='booking_ids/', blank=True, null=True)
    tourist_selfie_image = models.ImageField(upload_to='booking_selfies/', blank=True, null=True)
    
    # FINANCIALS
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 
    down_payment = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 
    balance_due = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 

    # [NEW] PAYOUT TRACKING
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="2% Commission for the App")
    guide_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Amount Admin must send to Guide")
    is_payout_settled = models.BooleanField(default=False, help_text="Has Admin sent the money to the Guide?")

    status = models.CharField(max_length=50, choices=STATUS_CHOICE, default='Pending_Payment')
    created_at = models.DateTimeField(auto_now_add=True)
    review_notification_sent = models.BooleanField(default=False)

    def clean(self):
        # 1. Basic Validation
        is_accommodation = self.accommodation is not None
        is_guide = self.guide is not None
        is_agency = self.agency is not None

        if not (is_guide or is_accommodation or is_agency):
            raise ValidationError("A booking must target a Guide, Accommodation, or Agency.")

        if is_agency and (is_guide or is_accommodation):
             raise ValidationError("Agency bookings cannot be combined with independent Guide or Accommodation bookings.")

        if (is_guide or is_agency) and self.destination is None:
            raise ValidationError("A destination is required when booking a guide or agency.")
        
        # 2. COLLISION DETECTION (Foolproof Date Locking)
        # Only check collisions for Confirmed bookings to avoid blocking calendars for unapproved requests
        if self.guide and self.status == 'Confirmed':
            overlapping_bookings = Booking.objects.filter(
                guide=self.guide,
                status='Confirmed',
                check_in__lt=self.check_out, 
                check_out__gt=self.check_in
            ).exclude(pk=self.pk) # Exclude self to allow updates

            if overlapping_bookings.exists():
                raise ValidationError("The guide is unavailable for these dates. Please choose another date range.")

    def save(self, *args, **kwargs):
        self.full_clean() # Force clean() to run on every save
        super().save(*args, **kwargs)
            
    def __str__(self):
        parts = []
        if self.accommodation:
            parts.append(f"Accom: {self.accommodation.title}")
        if self.guide:
            parts.append(f"Guide: {self.guide.username}")
        if self.agency:
            parts.append(f"Agency: {self.agency.username}")
            
        return f"Booking {self.id} ({', '.join(parts)}) - {self.status}"