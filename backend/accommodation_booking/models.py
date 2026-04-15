from django.db import models #type: ignore
from user_authentication.models import User 
from destinations_and_attractions.models import Destination, TourPackage
from agency_management_module.models import TouristGuide 
from django.core.exceptions import ValidationError #type: ignore
from django.db.models import Q #type: ignore

class Accommodation(models.Model):
    # The owner can be a local host OR an agency
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name="accommodations", null=True, blank=True)
    agency = models.ForeignKey('agency_management_module.Agency', related_name='accommodations', on_delete=models.CASCADE, null=True, blank=True)
    
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

    def clean(self):
        """Ensures the accommodation belongs to exactly one owner type."""
        if not self.host and not self.agency:
            raise ValidationError("An Accommodation must belong to either a host or an agency.")
        if self.host and self.agency:
            raise ValidationError("An Accommodation cannot belong to both a host and an agency.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class Booking(models.Model):
    """Represents a booking request or confirmed reservation."""
    
    STATUS_CHOICE = [
        ('Pending_Payment', 'Pending Payment'),
        ('Accepted', 'Accepted'), 
        ('Declined', 'Declined'), 
        ('Confirmed', 'Confirmed'), 
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
        ('Refunded', 'Refunded'),
    ]

    PAYOUT_CHANNEL_CHOICES = [
        ('GCash', 'GCash'),
        ('Bank', 'Bank Transfer'),
        ('Maya', 'Maya'),
        ('Cash', 'Cash'),
        ('Other', 'Other'),
    ]
    
    tourist = models.ForeignKey(User, limit_choices_to={'is_tourist': True}, related_name='tourist_bookings', on_delete=models.CASCADE)
    accommodation = models.ForeignKey(Accommodation, on_delete=models.CASCADE, blank=True, null=True)
    guide = models.ForeignKey(User, limit_choices_to={'is_local_guide': True, 'guide_approved': True}, related_name='guide_tours_booked', on_delete=models.CASCADE, blank=True, null=True)
    agency = models.ForeignKey(User, limit_choices_to={'is_staff': True}, related_name='agency_bookings', on_delete=models.CASCADE, blank=True, null=True)
    destination = models.ForeignKey(Destination, on_delete=models.SET_NULL, null=True, blank=True, related_name="bookings")
    tour_package = models.ForeignKey(TourPackage, on_delete=models.SET_NULL, null=True, blank=True, related_name='bookings')
    
    assigned_guides = models.ManyToManyField(User, related_name='assigned_bookings', blank=True, limit_choices_to={'is_local_guide': True, 'guide_approved': True})
    assigned_agency_guides = models.ManyToManyField(TouristGuide, related_name='assigned_bookings', blank=True)

    check_in = models.DateField()
    check_out = models.DateField()
    num_guests = models.IntegerField(default=1) 
    
    additional_guest_names = models.JSONField(default=list, blank=True, null=True, help_text="List of additional guest names")
    
    tourist_valid_id_image = models.ImageField(upload_to='booking_ids/', blank=True, null=True)
    tourist_selfie_image = models.ImageField(upload_to='booking_selfies/', blank=True, null=True)
    
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 
    down_payment = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 
    balance_due = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 

    downpayment_paid_at = models.DateTimeField(null=True, blank=True, help_text="When the down payment was successfully processed online")
    balance_paid_at = models.DateTimeField(null=True, blank=True, help_text="When the face-to-face balance was confirmed received")

    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="2% Commission for the App")
    guide_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Amount Admin must send to Guide")
    is_payout_settled = models.BooleanField(default=False, help_text="Has Admin sent the money to the Guide?")
    payout_settled_at = models.DateTimeField(null=True, blank=True, help_text="When the payout was marked as settled.")
    payout_channel = models.CharField(max_length=20, choices=PAYOUT_CHANNEL_CHOICES, null=True, blank=True, help_text="How the payout was sent to provider.")
    payout_reference_id = models.CharField(max_length=120, null=True, blank=True, help_text="GCash/bank transfer reference number.")
    payout_processed_by = models.ForeignKey(
        User,
        related_name='processed_booking_payouts',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        help_text='Admin/staff who marked this payout as settled.'
    )

    meetup_location = models.CharField(max_length=255, blank=True, null=True, help_text="Where the guide and tourist will meet")
    meetup_time = models.TimeField(blank=True, null=True)
    meetup_instructions = models.TextField(blank=True, null=True, help_text="e.g., Look for the guide holding a blue LocaLynk umbrella.")

    status = models.CharField(max_length=50, choices=STATUS_CHOICE, default='Pending_Payment')
    created_at = models.DateTimeField(auto_now_add=True)
    review_notification_sent = models.BooleanField(default=False)

    def clean(self):
        is_accommodation = self.accommodation is not None
        is_guide = self.guide is not None
        is_agency = self.agency is not None

        if not (is_guide or is_accommodation or is_agency):
            raise ValidationError("A booking must target a Guide, Accommodation, or Agency.")

        # REMOVED: is_agency combining with is_accommodation restriction so Agencies can book accommodations
        if is_agency and is_guide:
             raise ValidationError("Agency bookings cannot be combined with independent Guide bookings.")

        if (is_guide or is_agency) and self.destination is None:
            raise ValidationError("A destination is required when booking a guide or agency.")
        
        if self.guide and self.status == 'Confirmed':
            overlapping_bookings = Booking.objects.filter(
                guide=self.guide,
                status='Confirmed',
                check_in__lt=self.check_out, 
                check_out__gt=self.check_in
            ).exclude(pk=self.pk) 

            if overlapping_bookings.exists():
                raise ValidationError("The guide is unavailable for these dates. Please choose another date range.")

    def save(self, *args, **kwargs):
        self.full_clean() 
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


class BookingJourneyCheckpoint(models.Model):
    """Mutable per-stop tracking state for a booking's itinerary timeline."""

    booking = models.ForeignKey(
        Booking,
        related_name='journey_checkpoints',
        on_delete=models.CASCADE,
    )
    stop_key = models.CharField(max_length=80)
    day_number = models.PositiveIntegerField(default=1)
    stop_index = models.PositiveIntegerField(default=0)

    stop_name = models.CharField(max_length=255)
    start_time = models.CharField(max_length=20, blank=True, null=True)
    end_time = models.CharField(max_length=20, blank=True, null=True)
    stop_type = models.CharField(max_length=60, blank=True, null=True)

    is_checked = models.BooleanField(default=False)
    guide_remarks = models.TextField(blank=True, default='')
    tourist_remarks = models.TextField(blank=True, default='')

    checked_by = models.ForeignKey(
        User,
        related_name='journey_checkpoints_checked',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    checked_at = models.DateTimeField(null=True, blank=True)

    updated_by = models.ForeignKey(
        User,
        related_name='journey_checkpoints_updated',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['day_number', 'stop_index', 'id']
        constraints = [
            models.UniqueConstraint(
                fields=['booking', 'stop_key'],
                name='unique_booking_journey_stop_key',
            )
        ]

    def __str__(self):
        return f"Booking {self.booking_id} - Day {self.day_number} Stop {self.stop_index + 1}"