from rest_framework import serializers #type: ignore
from .models import Review, DestinationReview
from user_authentication.models import User
# Assuming 'destination' is the app where Destination model is located (using provided structure)
from destinations_and_attractions.models import Destination

# --- User/Guide Review Serializer ---

class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting and retrieving reviews for a User (Guide).
    """
    
    # Read-only display fields
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)
    reviewed_user_username = serializers.CharField(source='reviewed_user.username', read_only=True)
    
    # Writable field: Accepts the ID of the user being reviewed
    reviewed_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    # Reviewer is set automatically
    reviewer = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'reviewer', 'reviewer_username', 
            'reviewed_user', 'reviewed_user_username', 
            'rating', 'comment', 'timestamp'
        ]
        read_only_fields = ['timestamp']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
        
    def validate(self, data):
        # Prevent self-review
        reviewer = self.context['request'].user
        reviewed_user = data.get('reviewed_user')
        if reviewer.pk == reviewed_user.pk:
            raise serializers.ValidationError({"reviewed_user": "You cannot review yourself."})
            
        # Prevent duplicate review
        if Review.objects.filter(reviewer=reviewer, reviewed_user=reviewed_user).exists():
             raise serializers.ValidationError({"reviewed_user": "You have already submitted a review for this user."})
             
        return data


# --- Destination Review Serializer ---

class DestinationReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting and retrieving reviews for a Destination.
    """
    
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)
    destination_name = serializers.CharField(source='destination.name', read_only=True)

    # Writable field: Accepts the ID of the destination
    destination = serializers.PrimaryKeyRelatedField(queryset=Destination.objects.all())
    # Reviewer is set automatically
    reviewer = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = DestinationReview
        fields = [
            'id', 'reviewer', 'reviewer_username', 
            'destination', 'destination_name', 
            'rating', 'comment', 'timestamp'
        ]
        read_only_fields = ['timestamp']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
        
    def validate(self, data):
        # Prevent duplicate review for the destination
        reviewer = self.context['request'].user
        destination = data.get('destination')
        
        if DestinationReview.objects.filter(reviewer=reviewer, destination=destination).exists():
             raise serializers.ValidationError({"destination": "You have already submitted a review for this destination."})
             
        return data