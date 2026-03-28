from rest_framework import serializers #type: ignore
from .models import Agency, TouristGuide
from user_authentication.phone_utils import normalize_ph_phone

class AgencySerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)
    rating = serializers.FloatField(source='user.guide_rating', read_only=True, default=0.0)
    review_count = serializers.IntegerField(source='user.reviews_received.count', read_only=True, default=0)
    
    # NEW: Pull these fields from the associated User model to check visibility/status
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    is_guide_visible = serializers.BooleanField(source='user.is_guide_visible', read_only=True)

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
            'status', 
            'created_at', 
            'profile_picture',
            'rating',     
            'review_count',
            'down_payment_percentage',
            'is_active', 
            'is_guide_visible'
        ]
        read_only_fields = ("status", "created_at")

    def validate_phone(self, value):
        return normalize_ph_phone(value, "phone")

class TouristGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = TouristGuide
        fields = "__all__"
        read_only_fields = ("agency", "is_active", "created_at")

    def validate_contact_number(self, value):
        return normalize_ph_phone(value, "contact_number")

class AgencyApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ("status",)