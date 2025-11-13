from rest_framework import serializers #type: ignore
from .models import Payment
from accommodation_booking.models import Booking
from datetime import date
from django.contrib.auth import get_user_model # Ensure this is imported if needed

# Assuming BookingSerializer is accessible from accommodation_booking.serializers
# You would typically import it if you wanted deep nested details, but we'll keep it flat here.

User = get_user_model()


# --- 1. Payment Detail Serializer (For History/Admin Read-Only) ---

class PaymentSerializer(serializers.ModelSerializer):
    """
    Serializer for retrieving Payment records (Read-Only access).
    """
    payer_username = serializers.CharField(source='payer.username', read_only=True)
    
    # Simple display of the related booking ID
    related_booking_id = serializers.PrimaryKeyRelatedField(
        source='related_booking', read_only=True
    )

    class Meta:
        model = Payment
        fields = [
            'id', 'payer', 'payer_username', 'payment_type', 
            'related_booking_id', 
            'amount', 'service_fee', 'payment_method', 
            'paymongo_intent_id', 'gcash_transaction_id', 
            'status', 'receipt', 'timestamp'
        ]
        # All fields managed by the backend or database should be read-only for security
        read_only_fields = fields 


# --- 2. Payment Initiation Serializer (Used for POST from Frontend) ---

class PaymentInitiationSerializer(serializers.Serializer):
    """
    Serializer used by the frontend to request payment. 
    It focuses ONLY on the input fields needed from the Tourist.
    """
    booking_id = serializers.IntegerField(
        write_only=True, 
        required=False,
        help_text="The ID of the Accepted Booking to be paid."
    )
    payment_method = serializers.CharField(max_length=20, default="GCash")
    # amount field is included if it's a non-booking payment (e.g., Guide Registration Fee)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, help_text="Required for non-booking payments.")

    # Validation logic from your original model:
    def validate(self, data):
        booking_id = data.get('booking_id')
        amount = data.get('amount')
        
        # 1. Determine Payment Type based on presence of booking ID
        if booking_id:
            try:
                booking = Booking.objects.get(pk=booking_id)
            except Booking.DoesNotExist:
                raise serializers.ValidationError({"booking_id": "Booking does not exist."})
                
            # Crucial check: Payment should only be initiated for 'Accepted' bookings
            if booking.status != 'Accepted':
                raise serializers.ValidationError(
                    {"booking_id": f"Payment can only be initiated for 'Accepted' bookings (current status: {booking.status})."}
                )
            
            # Store the instance and set the payment type/amount
            self.booking_instance = booking
            data['payment_type'] = 'Accommodation' if booking.accommodation else 'Guide Tour'
            data['final_amount'] = booking.total_price # Use secure price from booking model
            
        elif amount is not None:
            # Assumed to be a Guide Registration fee or similar one-off fee
            data['payment_type'] = 'Guide Registration'
            data['final_amount'] = amount
            
        else:
            raise serializers.ValidationError(
                "Must provide either a 'booking_id' or 'amount' (for registration fee)."
            )
            
        return data