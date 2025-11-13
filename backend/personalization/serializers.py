from rest_framework import serializers #type: ignore
from .models import Personalization

class PersonalizationSerializer(serializers.ModelSerializer):
    """
    Serializer for managing user personalization settings.
    It links the profile to the user but makes the link read-only.
    """
    
    # Read-only field for easy identification by username (better than just the ID)
    username = serializers.CharField(source='user.username', read_only=True)
    
    # Primary Key field for the user (read-only, set by the view)
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
            'last_updated' # Using the auto-updating timestamp
        ]
        # 'user' is set by the view, and 'last_updated' is managed automatically by the model
        read_only_fields = ['user', 'last_updated']