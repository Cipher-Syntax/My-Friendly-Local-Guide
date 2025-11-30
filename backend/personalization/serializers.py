from rest_framework import serializers #type: ignore
from .models import Personalization

class PersonalizationSerializer(serializers.ModelSerializer):
    
    username = serializers.CharField(source='user.username', read_only=True)
    
    user = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Personalization
        fields = [
            'id', 
            'user', 
            'username', 
            'preferred_location', 
            'travel_categories', 
            'onboarding_completed', 
            'last_updated'
        ]
        read_only_fields = ['user', 'last_updated']