from django.db import models
from user_authentication.models import User
from accommodation_booking.models import Booking

# Create your models here.
class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('Accommodation', 'Accommodation'),
        ('Guide Registration', 'Guide Registrations')
    ]

    payer = models.ForeignKey(User, on_delete=models.CASCADE)
    payment_type = models.CharField(max_length=50, choices=PAYMENT_TYPE_CHOICES)
    related_booking = models.ForeignKey(Booking, blank=True, null=True, on_delete=models.SET_NULL)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    payment_method = models.CharField(max_length=20, default='GCash')
    gcash_transaction_id = models.CharField(max_length=255, blank=True, null=True)
    receipt = models.FileField(upload_to='receipts/', blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
