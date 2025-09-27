from rest_framework import serializers #type: ignore
from .models import Payment
from accommodation_booking.models import Booking

class PaymentSerializer(serializers.ModelSerializer):
    payer = serializers.PrimaryKeyRelatedField(read_only=True)
    related_booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Payment
        fields = [
            'id', 'payer', 'payment_type', 'related_booking',
            'amount', 'service_fee', 'payment_method',
            'gcash_transaction_id', 'gcash_response', 'receipt', 'timestamp'
        ]
        read_only_fields = ['service_fee', 'timestamp']

    def validate(self, data):
        ptype = data.get('payment_type')
        booking = data.get('related_booking')
        if ptype == 'Accommodation' and booking is None:
            raise serializers.ValidationError("Accommodation payment must be linked to a booking.")
        if ptype == 'Guide Registration' and booking is not None:
            raise serializers.ValidationError("Guide Registration must not be linked to a booking.")
        return data
