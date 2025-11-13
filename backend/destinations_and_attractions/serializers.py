from rest_framework import serializers #type: ignore
from .models import Destination, DestinationImage, Attraction
from django.contrib.auth import get_user_model

# Assuming 'user_auth' is the app where your main UserSerializer resides, 
# you'd ideally import and reuse it. For simplicity and to avoid circular imports, 
# we'll define a minimal User representation method here.

User = get_user_model()


# --- 1. Nested Serializers (Read-Only) ---

class DestinationImageSerializer(serializers.ModelSerializer):
    """Serializes the Destination Image model (for the image list)."""
    class Meta:
        model = DestinationImage
        fields = ['id', 'image', 'caption']


class AttractionSerializer(serializers.ModelSerializer):
    """Serializes the Attraction model (for points of interest within a Destination)."""
    class Meta:
        model = Attraction
        # 'destination' field is omitted because it's the parent of this nested data
        fields = ['id', 'name', 'description', 'photo', 'average_rating']

# --- 2. Main Destination Serializers ---

class DestinationSerializer(serializers.ModelSerializer):
    """
    Serializer for Destination details (Retrieve, Create, Update).
    Includes nested data for images, attractions, and the creator guide.
    """
    
    # Nested related models
    images = DestinationImageSerializer(many=True, read_only=True)
    attractions = AttractionSerializer(many=True, read_only=True)
    
    # Creator Guide Details (Minimal representation)
    creator = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Destination
        fields = [
            'id', 'name', 'description', 'category', 'location', 
            'latitude', 'longitude', 'average_rating', 'created_at',
            'creator', 'images', 'attractions',
        ]
        
    def get_creator(self, obj):
        """Returns minimal information about the guide who created the destination."""
        if obj.creator:
            return {
                'id': obj.creator.id,
                'username': obj.creator.username,
                'full_name': obj.creator.get_full_name(),
                'profile_picture': obj.creator.profile_picture.url if obj.creator.profile_picture else None,
            }
        return None


class DestinationListSerializer(serializers.ModelSerializer):
    """
    Lean serializer for listing multiple destinations (used for feeds/search). 
    """
    first_image = serializers.SerializerMethodField()
    
    class Meta:
        model = Destination
        fields = ['id', 'name', 'location', 'category', 'average_rating', 'first_image']
        
    def get_first_image(self, obj):
        """Returns the absolute URL of the first image for the list thumbnail."""
        first_image = obj.images.first()
        if first_image:
            # Requires 'request' in serializer context (e.g., from a ViewSet)
            return self.context['request'].build_absolute_uri(first_image.image.url)
        return None