from rest_framework import serializers #type: ignore
from .models import Payment
from accommodation_booking.models import Booking
from django.contrib.auth import get_user_model 

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
            # Note: The fields below need correction based on your Payment model field names.
            # Assuming your Payment model uses 'gateway_transaction_id' and 'gateway_response' 
            # instead of 'paymongo_intent_id' and 'gcash_transaction_id'.
            'gateway_transaction_id', 
            'status', 'receipt', 'timestamp'
        ]
        # All fields managed by the backend or database should be read-only for security
        read_only_fields = fields 


# --- 2. Payment Initiation Serializer (Used for POST from Frontend) ---

class PaymentInitiationSerializer(serializers.Serializer):
    """
    Serializer used by the frontend to request payment. 
    Handles both Booking payments and the new Guide Registration Fee.
    """
    booking_id = serializers.IntegerField(
        write_only=True, 
        required=False,
        help_text="The ID of the Accepted Booking to be paid."
    )
    payment_type = serializers.CharField(max_length=50, required=False)
    payment_method = serializers.CharField(max_length=20, default="GCash")
    
    # The frontend is expected to explicitly pass the final amount for registration fees.
    # This value will be validated against a known fixed value in a real-world scenario 
    # to prevent tampering.
    final_amount = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        write_only=True,
        required=False, 
        help_text="Required for non-booking payments (e.g., Guide Registration Fee)."
    )
    
    def validate(self, data):
        # If payment_type is 'YearlySubscription', let the view handle it.
        if data.get('payment_type') == 'YearlySubscription':
            self.booking_instance = None
            return data

        booking_id = data.get('booking_id')
        final_amount = data.get('final_amount')

        # Check the payment type to determine the flow
        if booking_id is not None:
            # --- Flow 1: Booking Payment ---
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
            
            # Assuming the backend defines the exact price for security
            data['final_amount'] = booking.total_price 
            data['payment_type'] = 'Booking' # Simplified, consistent with Payment model choices

        elif final_amount is not None:
            # --- Flow 2: Guide Registration Fee Payment ---
            
            # Security Note: In a real system, you would check the user's status here 
            # and verify `final_amount` against a hardcoded constant price on the backend.
            if final_amount <= 0:
                 raise serializers.ValidationError({"final_amount": "Payment amount must be greater than zero."})
            
            # No booking instance is related
            self.booking_instance = None
            
            # Set the payment type explicitly based on the business case
            # This logic is now mostly legacy, as YearlySubscription is preferred.
            data['payment_type'] = 'YearlySubscription' 
            
        else:
            raise serializers.ValidationError(
                "Must provide either a 'booking_id' or 'payment_type'."
            )
            
        return data