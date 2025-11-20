from rest_framework import serializers #type: ignore
from .models import Accommodation, Booking
from django.contrib.auth import get_user_model
from datetime import date

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
            'title', 'description', 'location', 'price',
            'photo', 'is_approved', 'average_rating', 'created_at'
        ]
        read_only_fields = ['is_approved', 'average_rating', 'created_at']



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
            'check_in', 'check_out', 'num_guests', 'total_price',
            'status', 'created_at'
        ]
        read_only_fields = ['status', 'created_at', 'total_price', 'assigned_guides']

    def get_guide_detail(self, obj):
        if obj.guide:
            from user_authentication.serializers import UserSerializer
            return UserSerializer(obj.guide).data
        return None

    def get_agency_detail(self, obj):
        if obj.agency:
            from user_authentication.serializers import UserSerializer
            return UserSerializer(obj.agency).data
        return None

    def get_assigned_guides_detail(self, obj):
        from user_authentication.serializers import UserSerializer
        return UserSerializer(obj.assigned_guides.all(), many=True).data

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

    def create(self, validated_data):
        return super().create(validated_data)
