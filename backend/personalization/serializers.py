from rest_framework import serializers #type: ignore
from .models import Personalization

class PersonalizationSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Personalization
        fields = ['id', 'user', 'preferred_location', 'travel_categories', 'onboarding_completed', 'created_at']
        read_only_fields = ['created_at']
