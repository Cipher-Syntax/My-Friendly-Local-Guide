from django.db import models
from user_authentication.models import User
from accommodation_booking.models import Booking
from django.db.models import JSONField 

class Payment(models.Model):
    PAYMENT_TYPE_CHOICES = [
        ('Booking', 'Booking Payment'),
        ('Fee', 'Service Fee'),
        ('YearlySubscription', 'Yearly Subscription'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ]

    payer = models.ForeignKey(User, on_delete=models.CASCADE, related_name="payments")
    payment_type = models.CharField(max_length=50, choices=PAYMENT_TYPE_CHOICES)

    related_booking = models.ForeignKey(
        Booking, blank=True, null=True, on_delete=models.SET_NULL, related_name="payments"
    )

    amount = models.DecimalField(max_digits=10, decimal_places=2)
    service_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)

    payment_method = models.CharField(max_length=20, default="GCash")

    gateway_transaction_id = models.CharField(max_length=255, blank=True, null=True, help_text="Generic gateway transaction ID.")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    gateway_response = JSONField(blank=True, null=True, help_text="Full response payload from the payment gateway.")
    receipt = models.FileField(upload_to="receipts/", blank=True, null=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payment_type} - {self.payer.username} - {self.amount} ({self.status})"