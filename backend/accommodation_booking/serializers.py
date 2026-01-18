from rest_framework import serializers 
from .models import Accommodation, Booking
from destinations_and_attractions.models import Destination
from django.contrib.auth import get_user_model
from datetime import date
import json

from agency_management_module.models import TouristGuide

User = get_user_model()


class SimpleDestinationSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Destination
        fields = ['id', 'name', 'image']

    def get_image(self, obj):
        first_img = obj.images.first() 
        if first_img and first_img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_img.image.url)
            return first_img.image.url
        return None


class AccommodationSerializer(serializers.ModelSerializer):
    host_id = serializers.PrimaryKeyRelatedField(source='host', read_only=True)
    host_username = serializers.CharField(source='host.username', read_only=True)
    host_full_name = serializers.CharField(source='host.get_full_name', read_only=True)
    destination_detail = SimpleDestinationSerializer(source='destination', read_only=True)

    class Meta:
        model = Accommodation
        fields = [
            'id', 'host_id', 'host_username', 'host_full_name',
            'title', 'description', 'location', 'price', 'photo',
            'accommodation_type', 'room_type', 'amenities',
            'offer_transportation', 'vehicle_type', 'transport_capacity',
            'transport_image', 'room_image',
            'destination', 'destination_detail',
            'is_approved', 'average_rating', 'created_at'
        ]
        read_only_fields = ['is_approved', 'average_rating', 'created_at', 'destination_detail']
        extra_kwargs = {
            'destination': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        amenities_data = validated_data.get('amenities')
        if isinstance(amenities_data, str):
            try:
                validated_data['amenities'] = json.loads(amenities_data)
            except json.JSONDecodeError:
                validated_data['amenities'] = {}
        return super().create(validated_data)


class BookingSerializer(serializers.ModelSerializer):
    tourist_id = serializers.PrimaryKeyRelatedField(source='tourist', read_only=True)
    tourist_username = serializers.CharField(source='tourist.username', read_only=True)

    accommodation_detail = AccommodationSerializer(source='accommodation', read_only=True)
    guide_detail = serializers.SerializerMethodField(read_only=True)
    agency_detail = serializers.SerializerMethodField(read_only=True)
    destination_detail = SimpleDestinationSerializer(source='destination', read_only=True)
    
    assigned_guides_detail = serializers.SerializerMethodField(read_only=True)
    assigned_agency_guides_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'tourist_id', 'tourist_username',
            'accommodation', 'guide', 'agency', 'destination',
            'accommodation_detail', 'guide_detail', 'agency_detail', 'destination_detail',
            'assigned_guides', 'assigned_guides_detail',
            'assigned_agency_guides', 'assigned_agency_guides_detail',

            'check_in', 'check_out', 'num_guests', 
            'tourist_valid_id_image', 'tourist_selfie_image', 
            
            # --- FINANCIAL FIELDS ---
            'total_price', 'down_payment', 'balance_due',
            
            # --- PAYOUT FIELDS ---
            'platform_fee', 'guide_payout_amount', 'is_payout_settled',
            
            'status', 'created_at'
        ]
        
        read_only_fields = [
            'status', 'created_at', 
            'total_price', 'down_payment', 'balance_due', 
            'platform_fee', 'guide_payout_amount', # Admin calculates these, user can't set them
            'assigned_guides', 'assigned_agency_guides', 'destination_detail'
        ]
        # Note: 'is_payout_settled' is writable via PATCH by Admin

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

    def get_assigned_agency_guides_detail(self, obj):
        request = self.context.get('request')
        guides_data = []
        for guide in obj.assigned_agency_guides.all():
            pic_url = None
            if guide.profile_picture:
                pic_url = guide.profile_picture.url
                if request:
                    pic_url = request.build_absolute_uri(pic_url)
            guides_data.append({
                'id': guide.id,
                'full_name': guide.full_name(), 
                'contact_number': guide.contact_number,
                'specialization': guide.specialization,
                'profile_picture': pic_url
            })
        return guides_data

    def validate(self, data):
        # --- FIX: Handle Partial Updates (PATCH) ---
        # If the field is not in 'data', try to get it from 'self.instance'
        
        if self.instance:
            accommodation = data.get('accommodation', self.instance.accommodation)
            guide = data.get('guide', self.instance.guide)
            agency = data.get('agency', self.instance.agency)
            destination = data.get('destination', self.instance.destination)
            check_in = data.get('check_in', self.instance.check_in)
            check_out = data.get('check_out', self.instance.check_out)
        else:
            # Creation mode: fields must be in data
            accommodation = data.get('accommodation')
            guide = data.get('guide')
            agency = data.get('agency')
            destination = data.get('destination')
            check_in = data.get('check_in')
            check_out = data.get('check_out')

        # --- Date Validation ---
        if check_in and check_out:
            if check_out <= check_in:
                raise serializers.ValidationError({"check_out": "Check-out must be after check-in."})
            
            # Only check "past date" on creation OR if check_in is explicitly being changed
            if not self.instance or 'check_in' in data:
                if check_in < date.today():
                    raise serializers.ValidationError({"check_in": "Check-in date cannot be in the past."})

        # --- Target Validation ---
        is_accommodation = accommodation is not None
        is_guide = guide is not None
        is_agency = agency is not None

        if not (is_guide or is_accommodation or is_agency):
            # This error was triggering because all 3 were None in the PATCH request
            raise serializers.ValidationError("A booking must target a Guide, Accommodation, or Agency.")

        if is_agency and (is_guide or is_accommodation):
             raise serializers.ValidationError("Agency bookings cannot be combined with independent Guide or Accommodation bookings.")

        if (is_guide or is_agency) and destination is None:
            raise serializers.ValidationError({"destination": "A destination is required when booking a guide or agency."})
        
        return data