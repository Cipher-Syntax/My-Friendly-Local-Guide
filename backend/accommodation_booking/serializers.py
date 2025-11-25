from rest_framework import serializers #type: ignore
from .models import Accommodation, Booking
from django.contrib.auth import get_user_model
from datetime import date
import json

User = get_user_model()

# -----------------------
#  ACCOMMODATION SERIALIZER
# -----------------------

class AccommodationSerializer(serializers.ModelSerializer):
    host_id = serializers.PrimaryKeyRelatedField(source='host', read_only=True)
    host_username = serializers.CharField(source='host.username', read_only=True)
    host_full_name = serializers.CharField(source='host.get_full_name', read_only=True)

    class Meta:
        model = Accommodation
        fields = [
            'id', 'host_id', 'host_username', 'host_full_name',
            'title', 'description', 'location', 'price', 'photo',
            # --- NEW FIELDS ---
            'accommodation_type', 'room_type', 'amenities',
            'offer_transportation', 'vehicle_type', 'transport_capacity',
            'transport_image', 'room_image',
            # ------------------
            'is_approved', 'average_rating', 'created_at'
        ]
        read_only_fields = ['is_approved', 'average_rating', 'created_at']

    def create(self, validated_data):
        # Fix for Multipart Form Data:
        # If 'amenities' comes in as a string (JSON), parse it into a dict.
        amenities_data = validated_data.get('amenities')
        if isinstance(amenities_data, str):
            try:
                validated_data['amenities'] = json.loads(amenities_data)
            except json.JSONDecodeError:
                validated_data['amenities'] = {}
        
        return super().create(validated_data)


# -----------------------
#  BOOKING SERIALIZER
# -----------------------

class BookingSerializer(serializers.ModelSerializer):
    tourist_id = serializers.PrimaryKeyRelatedField(source='tourist', read_only=True)
    tourist_username = serializers.CharField(source='tourist.username', read_only=True)

    accommodation_detail = AccommodationSerializer(source='accommodation', read_only=True)
    guide_detail = serializers.SerializerMethodField(read_only=True)
    agency_detail = serializers.SerializerMethodField(read_only=True)
    
    assigned_guides_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'tourist_id', 'tourist_username',
            'accommodation', 'guide', 'agency',
            'accommodation_detail', 'guide_detail', 'agency_detail',
            'assigned_guides', 'assigned_guides_detail',
            'check_in', 'check_out', 'num_guests', 'tourist_valid_id_image', 'total_price',
            'status', 'created_at'
        ]
        read_only_fields = ['status', 'created_at', 'total_price', 'assigned_guides']

    def get_guide_detail(self, obj):
        if obj.guide:
            from user_authentication.serializers import UserSerializer
            return UserSerializer(obj.guide, context=self.context).data
        return None

    def get_agency_detail(self, obj):
        if obj.agency:
            from user_authentication.serializers import UserSerializer
            return UserSerializer(obj.agency, context=self.context).data
        return None

    def get_assigned_guides_detail(self, obj):
        request = self.context.get('request')
        guides_data = []
        for guide in obj.assigned_guides.all():
            pic_url = None
            if guide.profile_picture:
                pic_url = guide.profile_picture.url
                if request:
                    pic_url = request.build_absolute_uri(pic_url)
            guides_data.append({
                'id': guide.id,
                'first_name': guide.first_name,
                'last_name': guide.last_name,
                'profile_picture': pic_url
            })
        return guides_data

    def validate(self, data):
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        accommodation = data.get('accommodation')
        guide = data.get('guide')
        agency = data.get('agency')

        # Dates
        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError({"check_out": "Check-out must be after check-in."})

        if check_in and check_in < date.today():
            raise serializers.ValidationError({"check_in": "Check-in date cannot be in the past."})

        # Mutually exclusive targets
        targets = [accommodation, guide, agency]
        if sum(x is not None for x in targets) != 1:
            raise serializers.ValidationError("A booking must be for exactly one of: Accommodation, Guide, or Agency.")

        return data