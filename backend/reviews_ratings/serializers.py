from rest_framework import serializers #type: ignore
from .models import Review, DestinationReview

class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'reviewer', 'reviewed_user', 'rating', 'comment', 'timestamp']
        
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

        
class DestinationReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = DestinationReview
        fields = ['id', 'reviewer', 'destination', 'rating', 'comment', 'timestamp']
        
    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value

        