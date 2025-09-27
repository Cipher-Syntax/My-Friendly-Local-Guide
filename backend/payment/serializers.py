from rest_framework import serializers #type: ignore
from .models import Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'payer', 'payment_type', 'related_booking', 'amount', 'service_fee', 'payment_method', 'gcash_transaction_id', 'gcash_response', 'receipt', 'timestamp']
        
    def validate(self, data):
        if data["payment_type"] == "Accommodation" and not data.get("related_booking"):
            raise serializers.ValidationError("Accommodation payments must be linked to a booking.")
        if data["payment_type"] == "Guide Registration" and data.get("related_booking"):
            raise serializers.ValidationError("Guide Registration payments should not link to a booking.")
        return data

        