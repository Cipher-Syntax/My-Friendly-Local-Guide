from rest_framework import serializers #type: ignore
from .models import Personalization

class PersonalizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Personalization
        fields = ['id', 'user', 'preferred_location', 'travel_categories', 'onboarding_completed', 'created_at']
        