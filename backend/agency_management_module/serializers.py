# app/serializers.py

from rest_framework import serializers #type: ignore
from .models import Agency, TouristGuide


class AgencySerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ['id', 'business_name', 'owner_name', 'email', 'phome', 'phone', 'business_license', 'is_approved', 'created_at']
        read_only_fields = ("is_approved", "created_at")


class AgencyApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ("is_approved",)


class TouristGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = TouristGuide
        fields = "__all__"
        read_only_fields = ("is_active", "created_at")

    def validate(self, data):
        agency = data["agency"]
        if not agency.is_approved:
            raise serializers.ValidationError("Agency not approved.")
        return data
