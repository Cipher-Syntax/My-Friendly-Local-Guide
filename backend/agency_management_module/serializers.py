from rest_framework import serializers #type: ignore
from .models import Agency, TouristGuide

class AgencySerializer(serializers.ModelSerializer):
    # 🔥 FIX: Get profile picture from the linked User account
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)

    class Meta:
        model = Agency
        # Add 'profile_picture' to fields
        fields = ['id','user', 'business_name', 'owner_name', 'email', 'phone', 'business_license', 'is_approved', 'created_at', 'profile_picture']
        read_only_fields = ("is_approved", "created_at")

class TouristGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = TouristGuide
        fields = "__all__"
        read_only_fields = ("agency", "is_active", "created_at") # Agency is set automatically in view

class AgencyApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ("is_approved",)