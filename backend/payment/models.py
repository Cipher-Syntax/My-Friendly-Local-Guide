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
        ('refund_required', 'Refund Required'),
        ('refunded', 'Refunded'),
    ]

    REFUND_STATUS_CHOICES = [
        ('none', 'None'),
        ('requested', 'Requested'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
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
    gateway_payment_id = models.CharField(max_length=255, blank=True, null=True, help_text="Gateway payment object ID used for issuing refunds.")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    refund_status = models.CharField(max_length=20, choices=REFUND_STATUS_CHOICES, default='none')
    refunded_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    refunded_at = models.DateTimeField(null=True, blank=True)

    gateway_response = JSONField(blank=True, null=True, help_text="Full response payload from the payment gateway.")
    receipt = models.FileField(upload_to="receipts/", blank=True, null=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payment_type} - {self.payer.username} - {self.amount} ({self.status})"


class RefundRequest(models.Model):
    STATUS_CHOICES = [
        ('requested', 'Requested'),
        ('under_review', 'Under Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    ]

    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='refund_requests')
    booking = models.ForeignKey(
        Booking,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='refund_requests'
    )

    requested_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='refund_requests')
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_refund_requests'
    )

    reason = models.TextField()
    requested_amount = models.DecimalField(max_digits=10, decimal_places=2)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    proof_attachment = models.FileField(upload_to='refund_proofs/', null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    admin_notes = models.TextField(blank=True, null=True)

    request_date = models.DateTimeField(auto_now_add=True)
    process_date = models.DateTimeField(null=True, blank=True)
    completed_date = models.DateTimeField(null=True, blank=True)

    gateway_refund_id = models.CharField(max_length=255, blank=True, null=True)
    gateway_response = JSONField(blank=True, null=True)

    class Meta:
        ordering = ['-request_date']

    def __str__(self):
        return f"Refund #{self.id} for Payment #{self.payment_id} ({self.status})"