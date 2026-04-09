from rest_framework import serializers 
from decimal import Decimal
from django.conf import settings
from django.utils import timezone

from .models import Payment, RefundRequest
from accommodation_booking.models import Booking
from django.contrib.auth import get_user_model 
from datetime import date # Added for date checking

User = get_user_model()

class PaymentSerializer(serializers.ModelSerializer):
    payer_username = serializers.CharField(source='payer.username', read_only=True)
    related_booking_id = serializers.PrimaryKeyRelatedField(
        source='related_booking', read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            'id', 'payer', 'payer_username', 'payment_type', 
            'related_booking_id', 
            'amount', 'service_fee', 'payment_method', 
            'gateway_transaction_id', 
            'status', 'refund_status', 'refunded_amount', 'refunded_at',
            'receipt', 'timestamp'
        ]
        read_only_fields = fields 


class PaymentInitiationSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField(
        write_only=True, 
        required=False,
        help_text="The ID of the Booking to be paid."
    )
    payment_type = serializers.CharField(max_length=50, required=False)
    payment_method = serializers.CharField(max_length=20, default="GCash")
    
    final_amount = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        write_only=True,
        required=False, 
        help_text="Required for non-booking payments (e.g., Guide Registration Fee)."
    )
    
    def validate(self, data):
        # 1. Handle Subscription Payment
        if data.get('payment_type') == 'YearlySubscription':
            self.booking_instance = None
            return data

        booking_id = data.get('booking_id')
        final_amount = data.get('final_amount')

        # 2. Handle Booking Payment
        if booking_id is not None:
            try:
                booking = Booking.objects.get(pk=booking_id)
            except Booking.DoesNotExist:
                raise serializers.ValidationError({"booking_id": "Booking does not exist."})
                
            # --- FIXED: Allow 'Pending_Payment' so instant booking works ---
            allowed_statuses = ['Accepted', 'Pending_Payment']
            if booking.status not in allowed_statuses:
                raise serializers.ValidationError(
                    {"booking_id": f"Payment can only be initiated for 'Accepted' or 'Pending_Payment' bookings (current status: {booking.status})."}
                )
            
            # --- NEW: Free Tier "One Active Booking" Limit Check ---
            if booking.guide:
                # Check if guide is on Free Tier (assuming anything not 'paid' is free)
                guide_tier = getattr(booking.guide, 'guide_tier', 'free')
                
                if guide_tier != 'paid':
                    # Count ACTIVE bookings only (Confirmed status AND not yet finished)
                    # We exclude the current booking ID to be safe
                    active_bookings_count = Booking.objects.filter(
                        guide=booking.guide,
                        status='Confirmed',
                        check_out__gte=date.today() # Trip is happening today or in the future
                    ).exclude(id=booking.id).count()

                    if active_bookings_count >= 1:
                        raise serializers.ValidationError(
                            {"booking_id": "This guide is currently on the Free Tier and already has an active booking. They cannot accept another until the current trip is finished."}
                        )
            
            self.booking_instance = booking
            
            # --- FIXED: Charge Down Payment if it exists ---
            if hasattr(booking, 'down_payment') and booking.down_payment > 0:
                data['final_amount'] = booking.down_payment
            else:
                data['final_amount'] = booking.total_price 
            
            data['payment_type'] = 'Booking'

        # 3. Handle Generic/Manual Amount
        elif final_amount is not None:
            if final_amount <= 0:
                 raise serializers.ValidationError({"final_amount": "Payment amount must be greater than zero."})
            
            self.booking_instance = None
            data['payment_type'] = 'YearlySubscription' # Defaulting to subscription if no booking ID
            
        else:
            raise serializers.ValidationError(
                "Must provide either a 'booking_id' or 'payment_type'."
            )
            
        return data


class RefundRequestSerializer(serializers.ModelSerializer):
    requested_by_username = serializers.CharField(source='requested_by.username', read_only=True)
    requested_by_phone = serializers.CharField(source='requested_by.phone_number', read_only=True)
    processed_by_username = serializers.CharField(source='processed_by.username', read_only=True)
    payment_id = serializers.IntegerField(source='payment.id', read_only=True)
    booking_id = serializers.IntegerField(source='booking.id', read_only=True)
    payment_amount = serializers.DecimalField(source='payment.amount', max_digits=10, decimal_places=2, read_only=True)
    payment_status = serializers.CharField(source='payment.status', read_only=True)
    proof_attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = RefundRequest
        fields = [
            'id',
            'payment_id',
            'booking_id',
            'requested_by',
            'requested_by_username',
            'requested_by_phone',
            'processed_by',
            'processed_by_username',
            'reason',
            'requested_amount',
            'approved_amount',
            'proof_attachment',
            'proof_attachment_url',
            'status',
            'admin_notes',
            'request_date',
            'process_date',
            'completed_date',
            'gateway_refund_id',
            'gateway_response',
            'payment_amount',
            'payment_status',
        ]
        read_only_fields = [
            'requested_by',
            'processed_by',
            'request_date',
            'process_date',
            'completed_date',
            'gateway_refund_id',
            'gateway_response',
            'payment_amount',
            'payment_status',
            'proof_attachment_url',
        ]

    def get_proof_attachment_url(self, obj):
        if not obj.proof_attachment:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.proof_attachment.url)
        return obj.proof_attachment.url


class RefundRequestCreateSerializer(serializers.Serializer):
    booking_id = serializers.IntegerField(required=False)
    payment_id = serializers.IntegerField(required=False)
    reason = serializers.CharField(max_length=1000)
    requested_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    proof_attachment = serializers.FileField(required=True)

    def validate(self, data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            raise serializers.ValidationError('Authentication is required.')

        payment = None
        payment_id = data.get('payment_id')
        booking_id = data.get('booking_id')

        if payment_id:
            payment = Payment.objects.select_related('related_booking').filter(id=payment_id, payer=user).first()
            if not payment:
                raise serializers.ValidationError({'payment_id': 'Payment not found or not owned by this user.'})
        elif booking_id:
            payment = (
                Payment.objects.select_related('related_booking')
                .filter(
                    payer=user,
                    related_booking_id=booking_id,
                    payment_type='Booking',
                    status='succeeded',
                )
                .order_by('-timestamp')
                .first()
            )
            if not payment:
                raise serializers.ValidationError({'booking_id': 'No successful booking payment found for this booking.'})
        else:
            raise serializers.ValidationError('Either booking_id or payment_id is required.')

        if payment.payment_type != 'Booking':
            raise serializers.ValidationError({'payment_id': 'Only booking downpayment refunds are supported.'})

        if payment.status not in ('succeeded', 'refund_required', 'refunded'):
            raise serializers.ValidationError({'payment_id': f"Payment cannot be refunded while in '{payment.status}' status."})

        booking = payment.related_booking
        if not booking:
            raise serializers.ValidationError({'payment_id': 'Booking-linked payment is required for refund requests.'})

        if booking.status in {'Completed', 'Refunded'}:
            raise serializers.ValidationError({'booking_id': 'This booking is no longer eligible for downpayment refund requests.'})

        min_days_before_check_in = int(getattr(settings, 'REFUND_REQUEST_MIN_DAYS_BEFORE_CHECKIN', 3) or 0)
        min_days_before_check_in = max(0, min_days_before_check_in)

        if booking.check_in:
            days_until_check_in = (booking.check_in - timezone.localdate()).days
            if days_until_check_in < min_days_before_check_in:
                raise serializers.ValidationError(
                    {
                        'booking_id': (
                            f"Refund requests must be submitted at least {min_days_before_check_in} "
                            f"day(s) before check-in."
                        )
                    }
                )

        active_exists = RefundRequest.objects.filter(
            payment=payment,
            status__in=['requested', 'under_review', 'approved', 'completed'],
        ).exists()
        if active_exists:
            raise serializers.ValidationError({'payment_id': 'A refund request already exists for this payment.'})

        requested_amount = data.get('requested_amount')
        if requested_amount is None:
            requested_amount = payment.amount

        requested_amount = Decimal(requested_amount)
        if requested_amount <= 0:
            raise serializers.ValidationError({'requested_amount': 'Refund amount must be greater than zero.'})
        if requested_amount > payment.amount:
            raise serializers.ValidationError({'requested_amount': 'Refund amount cannot exceed paid downpayment.'})

        proof = data.get('proof_attachment')
        if not proof:
            raise serializers.ValidationError({'proof_attachment': 'Proof attachment is required.'})

        max_size = 5 * 1024 * 1024
        if getattr(proof, 'size', 0) > max_size:
            raise serializers.ValidationError({'proof_attachment': 'File exceeds 5MB size limit.'})

        allowed_extensions = ('.jpg', '.jpeg', '.png', '.pdf')
        file_name = (getattr(proof, 'name', '') or '').lower()
        if not file_name.endswith(allowed_extensions):
            raise serializers.ValidationError({'proof_attachment': 'Allowed file types are JPG, PNG, and PDF.'})

        data['payment'] = payment
        data['booking'] = booking
        data['requested_amount'] = requested_amount.quantize(Decimal('0.01'))
        return data


class RefundProcessSerializer(serializers.Serializer):
    ACTION_CHOICES = [
        ('under_review', 'Under Review'),
        ('approve', 'Approve'),
        ('reject', 'Reject'),
        ('complete', 'Complete'),
    ]

    action = serializers.ChoiceField(choices=ACTION_CHOICES)
    approved_amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    admin_notes = serializers.CharField(required=False, allow_blank=True, max_length=2000)

    def validate(self, data):
        action = data.get('action')
        amount = data.get('approved_amount')

        if action in ('approve', 'complete') and amount is not None and amount <= 0:
            raise serializers.ValidationError({'approved_amount': 'Approved amount must be greater than zero.'})

        return data