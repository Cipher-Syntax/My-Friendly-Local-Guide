from django.db import models
from user_authentication.models import User
from accommodation_booking.models import Booking

class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('Accommodation', 'Accommodation'),
        ('Guide Registration', 'Guide Registration'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    payer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    payment_type = models.CharField(max_length=50, choices=PAYMENT_TYPE_CHOICES)

    related_booking = models.ForeignKey(
        Booking, blank=True, null=True, on_delete=models.SET_NULL, related_name="payments"
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)

    payment_method = models.CharField(max_length=20, default="GCash")

    # PayMongo integration fields
    paymongo_intent_id = models.CharField(max_length=255, blank=True, null=True)   # PaymentIntent ID
    gcash_transaction_id = models.CharField(max_length=255, blank=True, null=True) # Source/Payment ID
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    gcash_response = models.JSONField(blank=True, null=True)  # full API response storage
    receipt = models.FileField(upload_to="receipts/", blank=True, null=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payment_type} - {self.payer.username} - {self.amount} ({self.status})"
