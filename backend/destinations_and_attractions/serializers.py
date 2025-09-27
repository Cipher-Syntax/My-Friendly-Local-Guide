from rest_framework import serializers #type: ignore
from .models import Destination, Attraction

class DestinationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Destination
        fields = ['id', 'name', 'description', 'category', 'location', 'photo', 'average_rating']
        
class AttractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attraction
        fields = ['id', 'destination', 'name', 'description', 'photo', 'average_rating']