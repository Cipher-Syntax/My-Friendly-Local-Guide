from rest_framework import serializers
from .models import Personalization
from destinations_and_attractions.models import Destination
from destinations_and_attractions.serializers import DestinationSerializer

class PersonalizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personalization
        fields = ['preferred_location', 'travel_categories', 'onboarding_completed', 'preferred_destinations']
        extra_kwargs = {
            'preferred_destinations': {'write_only': True} # Accepts IDs on write
        }

class PersonalizationDetailSerializer(serializers.ModelSerializer):
    # CRITICAL: This overrides the default behavior to return full Destination objects
    preferred_destinations = DestinationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Personalization
        fields = ['preferred_location', 'travel_categories', 'onboarding_completed', 'preferred_destinations']