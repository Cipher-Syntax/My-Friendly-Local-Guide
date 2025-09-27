from rest_framework import serializers #type: ignore
from .models import Accommodation, Booking

class AccommodationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Accommodation
        fields = ['id', 'host', 'title', 'description', 'location', 'price', 'photo', 'is_approved']
        
class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = ['id', 'tourist', 'accommodation', 'check_in', 'check_out', 'status', 'created_at']