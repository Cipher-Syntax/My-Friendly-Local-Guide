from rest_framework import serializers #type: ignore
from .models import Accommodation, Booking
from user_authentication.models import User

class AccommodationSerializer(serializers.ModelSerializer):
    host = serializers.PrimaryKeyRelatedField(read_only=True)
    host_username = serializers.CharField(source='host.username', read_only=True)

    class Meta:
        model = Accommodation
        fields = ['id', 'host', 'host_username', 'title', 'description', 'location', 'price', 'photo', 'is_approved']

    def validate(self, data):
        return data

class BookingSerializer(serializers.ModelSerializer):
    tourist = serializers.PrimaryKeyRelatedField(read_only=True)
    accommodation = serializers.PrimaryKeyRelatedField(queryset=Accommodation.objects.all())

    class Meta:
        model = Booking
        fields = ['id', 'tourist', 'accommodation', 'check_in', 'check_out', 'status', 'created_at']
        read_only_fields = ['status', 'created_at']

    def validate(self, data):
        check_in = data.get('check_in')
        check_out = data.get('check_out')
        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError("check_out must be after check_in")
        return data
