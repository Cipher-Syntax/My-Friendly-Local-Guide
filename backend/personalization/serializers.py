from rest_framework import serializers
from .models import Personalization
from destinations_and_attractions.models import Destination
from destinations_and_attractions.serializers import DestinationSerializer
from backend.location_policy import validate_zds_location_payload

class PersonalizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personalization
        fields = [
            'preferred_location',
            'preferred_municipality',
            'preferred_latitude',
            'preferred_longitude',
            'travel_categories',
            'onboarding_completed',
            'preferred_destinations',
        ]
        extra_kwargs = {
            'preferred_destinations': {'write_only': True} # Accepts IDs on write
        }

    def validate(self, attrs):
        location_keys = {'preferred_location', 'preferred_municipality', 'preferred_latitude', 'preferred_longitude'}
        if not any(key in attrs for key in location_keys):
            return attrs

        try:
            normalized = validate_zds_location_payload(
                location=attrs.get('preferred_location', getattr(self.instance, 'preferred_location', None)),
                municipality=attrs.get('preferred_municipality', getattr(self.instance, 'preferred_municipality', None)),
                latitude=attrs.get('preferred_latitude', getattr(self.instance, 'preferred_latitude', None)),
                longitude=attrs.get('preferred_longitude', getattr(self.instance, 'preferred_longitude', None)),
                require_location=False,
            )
        except ValueError as exc:
            raise serializers.ValidationError({'preferred_location': str(exc)})

        attrs['preferred_location'] = normalized['location']
        attrs['preferred_municipality'] = normalized['municipality'] or None
        attrs['preferred_latitude'] = normalized['latitude']
        attrs['preferred_longitude'] = normalized['longitude']
        return attrs

class PersonalizationDetailSerializer(serializers.ModelSerializer):
    # CRITICAL: This overrides the default behavior to return full Destination objects
    preferred_destinations = DestinationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Personalization
        fields = [
            'preferred_location',
            'preferred_municipality',
            'preferred_latitude',
            'preferred_longitude',
            'travel_categories',
            'onboarding_completed',
            'preferred_destinations',
        ]