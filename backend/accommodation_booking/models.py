from django.db import models
from user_authentication.models import User 

# ===============================================
#          ACCOMMODATION MODEL
# ===============================================
class Accommodation(models.Model):
    host = models.ForeignKey(User, on_delete=models.CASCADE, related_name="accommodations")
    
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    photo = models.ImageField(upload_to="accommodations/")

    # 🔥 ADD THESE ↓↓↓
    accommodation_type = models.CharField(max_length=100, null=True, blank=True)
    room_type = models.CharField(max_length=100, null=True, blank=True)
    amenities = models.JSONField(default=dict, null=True, blank=True)

    offer_transportation = models.BooleanField(default=False)
    vehicle_type = models.CharField(max_length=100, null=True, blank=True)
    transport_capacity = models.IntegerField(null=True, blank=True)

    room_image = models.ImageField(upload_to='accommodations/rooms/', null=True, blank=True)
    transport_image = models.ImageField(upload_to='accommodations/transport/', null=True, blank=True)
    # 🔥 END OF NEW FIELDS

    is_approved = models.BooleanField(default=False)
    average_rating = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)


# ===============================================
#          BOOKING MODEL
# ===============================================

class Booking(models.Model):
    """Represents a booking request or confirmed reservation."""
    
    # SIMPLIFIED STATUS CHOICES
    STATUS_CHOICE = [
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('Declined', 'Declined'),
        ('Paid', 'Paid'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]
    
    # Links to the Tourist
    tourist = models.ForeignKey(
        User, 
        limit_choices_to={'is_tourist': True}, 
        related_name='tourist_bookings', 
        on_delete=models.CASCADE
    )
    
    # Booking Target (must be EITHER accommodation OR guide)
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
    assigned_guides = models.ManyToManyField(
        User,
        related_name='assigned_bookings',
        blank=True,
        limit_choices_to={'is_local_guide': True, 'guide_approved': True}
    )

    # Core Details
    check_in = models.DateField()
    check_out = models.DateField()
    num_guests = models.IntegerField(default=1) 
    tourist_valid_id_image = models.ImageField(upload_to='booking_ids/', blank=True, null=True)
    
    # Financials
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00) 

    # Status
    status = models.CharField(max_length=50, choices=STATUS_CHOICE, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

    # Custom validation ensures only one target is set
    def clean(self):
        targets = [self.accommodation, self.guide, self.agency]
        if sum(x is not None for x in targets) != 1:
            raise models.ValidationError("A booking must be for exactly one of: Accommodation, Guide, or Agency.")
            
    def __str__(self):
        if self.accommodation:
            return f'Accommodation Booking: {self.accommodation.title} ({self.status})'
        elif self.guide:
            return f'Guide Booking: {self.guide.username} ({self.status})'
        elif self.agency:
            return f'Agency Booking: {self.agency.username} ({self.status})'
        return f'Booking ID {self.id} - {self.status}'