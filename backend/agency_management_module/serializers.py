from rest_framework import serializers #type: ignore
from .models import Agency, TouristGuide

class AgencySerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)
    rating = serializers.FloatField(source='user.guide_rating', read_only=True, default=0.0)
    review_count = serializers.IntegerField(source='user.reviews_received.count', read_only=True, default=0)

    class Meta:
        model = Agency
        fields = [
            'id', 
            'user', 
            'business_name', 
            'owner_name', 
            'email', 
            'phone', 
            'business_license', 
            'is_approved', 
            'created_at', 
            'profile_picture',
            'rating',     
            'review_count' 
        ]
        read_only_fields = ("is_approved", "created_at")

class TouristGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = TouristGuide
        fields = "__all__"
        read_only_fields = ("agency", "is_active", "created_at")

class AgencyApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ("is_approved",)