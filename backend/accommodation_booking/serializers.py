from rest_framework import serializers #type: ignore
from .models import Accommodation, Booking
from django.contrib.auth import get_user_model
from datetime import date

User = get_user_model()


# --- 1. Accommodation Serializer ---

class AccommodationSerializer(serializers.ModelSerializer):
    """
    Serializer for Accommodation listings (CRUD for Hosts, Read-only for Tourists).
    """
    # Read-only fields for host information
    host_id = serializers.PrimaryKeyRelatedField(source='host', read_only=True)
    host_username = serializers.CharField(source='host.username', read_only=True)
    host_full_name = serializers.CharField(source='host.get_full_name', read_only=True)
    
    class Meta:
        model = Accommodation
        fields = [
            'id', 'host_id', 'host_username', 'host_full_name', 
            'title', 'description', 'location', 'price', 
            'photo', 'is_approved', 'average_rating'
        ]
        read_only_fields = ['is_approved', 'average_rating']

    # Custom validation (if needed beyond the default model validation)
    # def validate(self, data):
    #     return data


# --- 2. Booking Serializer ---

class BookingSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and managing bookings (for both Accommodation and Guide tours).
    """
    # Read-only fields for tourist and target identification
    tourist_id = serializers.PrimaryKeyRelatedField(source='tourist', read_only=True)
    tourist_username = serializers.CharField(source='tourist.username', read_only=True)
    
    # Read-only details of the booked items
    accommodation_detail = AccommodationSerializer(source='accommodation', read_only=True)
    guide_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'tourist_id', 'tourist_username', 
            # Writable targets (Accepts IDs on POST/PUT)
            'accommodation', 'guide',
            # Read-only target details
            'accommodation_detail', 'guide_detail',
            # Core Details
            'check_in', 'check_out', 'num_guests', 'total_price', 
            # Status and Meta
            'status', 'created_at'
        ]
        # total_price is calculated in the view. Status is managed by the host/guide.
        read_only_fields = ['status', 'created_at', 'total_price']
        
    def get_guide_detail(self, obj):
        """Provides minimal details for the guide target using the User model."""
        if obj.guide:
            # Assumes the guide has essential price data on the User model
            return {
                'id': obj.guide.id,
                'username': obj.guide.username,
                'full_name': obj.guide.get_full_name(),
                'price_per_day': obj.guide.price_per_day, # For client-side display
            }
        return None

    def validate(self, data):
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        accommodation = data.get('accommodation')
        guide = data.get('guide')
        
        # 1. Date Validation
        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError({"check_out": "Check-out must be after check-in."})

        if check_in and check_in < date.today():
             raise serializers.ValidationError({"check_in": "Check-in date cannot be in the past."})

        # 2. Mutually Exclusive Target Validation
        # This checks if the request is trying to set both or neither target.
        if (accommodation and guide) or (not accommodation and not guide):
            raise serializers.ValidationError(
                "Booking must target either an accommodation OR a guide, but not both or neither."
            )
            
        return data

    def create(self, validated_data):
        # NOTE: The ViewSet handles assigning the 'tourist' and calculating 'total_price'.
        return super().create(validated_data)