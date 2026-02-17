from rest_framework import serializers 
from .models import Payment
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
            'status', 'receipt', 'timestamp'
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