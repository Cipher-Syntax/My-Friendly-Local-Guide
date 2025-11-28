from rest_framework import serializers #type: ignore
from .models import Review, DestinationReview
from user_authentication.models import User
from destinations_and_attractions.models import Destination
from accommodation_booking.models import Booking

# --- User/Guide Review Serializer ---

class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting and retrieving reviews for a User (Guide).
    """
    
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)
    reviewed_user_username = serializers.CharField(source='reviewed_user.username', read_only=True)
    
    reviewed_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    reviewer = serializers.PrimaryKeyRelatedField(read_only=True)
    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all(), write_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'reviewer', 'reviewer_username', 
            'reviewed_user', 'reviewed_user_username', 
            'rating', 'comment', 'timestamp', 'booking'
        ]
        read_only_fields = ['timestamp', 'reviewer']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
        
    def validate(self, data):
        reviewer = self.context['request'].user
        reviewed_user = data.get('reviewed_user')
        booking = data.get('booking')

        if reviewer.pk == reviewed_user.pk:
            raise serializers.ValidationError({"reviewed_user": "You cannot review yourself."})
            
        if Review.objects.filter(booking=booking, reviewer=reviewer).exists():
             raise serializers.ValidationError({"booking": "You have already submitted a guide review for this booking."})
             
        return data


# --- Destination Review Serializer ---

class DestinationReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting and retrieving reviews for a Destination.
    """
    
    reviewer_username = serializers.CharField(source='reviewer.username', read_only=True)
    destination_name = serializers.CharField(source='destination.name', read_only=True)

    destination = serializers.PrimaryKeyRelatedField(queryset=Destination.objects.all())
    reviewer = serializers.PrimaryKeyRelatedField(read_only=True)
    booking = serializers.PrimaryKeyRelatedField(queryset=Booking.objects.all(), write_only=True)

    class Meta:
        model = DestinationReview
        fields = [
            'id', 'reviewer', 'reviewer_username', 
            'destination', 'destination_name', 
            'rating', 'comment', 'timestamp', 'booking'
        ]
        read_only_fields = ['timestamp', 'reviewer']

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be between 1 and 5.")
        return value
        
    def validate(self, data):
        reviewer = self.context['request'].user
        destination = data.get('destination')
        booking = data.get('booking')
        
        if DestinationReview.objects.filter(booking=booking, reviewer=reviewer).exists():
             raise serializers.ValidationError({"booking": "You have already submitted a destination review for this booking."})
             
        return data