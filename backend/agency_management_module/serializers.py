from rest_framework import serializers #type: ignore
from .models import Agency, TouristGuide
from user_authentication.phone_utils import normalize_ph_phone


def _normalize_string_list(raw_value):
    if raw_value is None:
        source = []
    elif isinstance(raw_value, (list, tuple, set)):
        source = list(raw_value)
    elif isinstance(raw_value, str):
        source = raw_value.split(',')
    else:
        source = [raw_value]

    normalized = []
    seen = set()

    for value in source:
        token = str(value or '').strip()
        if not token:
            continue

        key = token.lower()
        if key in seen:
            continue

        seen.add(key)
        normalized.append(token)

    return normalized


def _resolve_specializations_payload(data, instance=None):
    has_specializations = 'specializations' in data
    has_specialization = 'specialization' in data

    existing_specializations = _normalize_string_list(getattr(instance, 'specializations', [])) if instance else []
    existing_specialization = str(getattr(instance, 'specialization', '') or '').strip() if instance else ''

    specializations = list(existing_specializations)
    specialization = existing_specialization

    if has_specializations:
        specializations = _normalize_string_list(data.get('specializations'))

    if has_specialization:
        incoming_specialization = str(data.get('specialization') or '').strip()
        specialization = incoming_specialization

        if incoming_specialization and not has_specializations:
            specializations = _normalize_string_list([incoming_specialization])

    if has_specializations and not has_specialization:
        specialization = specializations[0] if specializations else ''

    if has_specialization and not specialization and specializations:
        specialization = specializations[0]

    if specialization and not specializations:
        specializations = _normalize_string_list([specialization])

    return specializations, (specialization or None)

class AgencySerializer(serializers.ModelSerializer):
    profile_picture = serializers.ImageField(source='user.profile_picture', read_only=True)
    rating = serializers.FloatField(source='user.guide_rating', read_only=True, default=0.0)
    review_count = serializers.IntegerField(source='user.reviews_received.count', read_only=True, default=0)
    
    is_active = serializers.BooleanField(source='user.is_active', read_only=True)
    is_guide_visible = serializers.BooleanField(source='user.is_guide_visible', read_only=True)

    tour_packages = serializers.SerializerMethodField()
    user_details = serializers.SerializerMethodField()

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
            'logo',
            'status', 
            'created_at', 
            'profile_picture',
            'rating',     
            'review_count',
            'down_payment_percentage',
            'is_active', 
            'is_guide_visible',
            
            # NEW: Added availability schedule fields
            'available_days',
            'opening_time',
            'closing_time',

            'tour_packages',
            'user_details'
        ]
        read_only_fields = ("status", "created_at")

    def get_tour_packages(self, obj):
        from destinations_and_attractions.serializers import TourPackageSerializer
        return TourPackageSerializer(obj.tour_packages.all(), many=True, context=self.context).data

    def get_user_details(self, obj):
        if obj.user:
            return {
                "municipality": obj.user.municipality,
                "location": obj.user.location,
            }
        return None

    def validate_phone(self, value):
        return normalize_ph_phone(value, "phone")

class TouristGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = TouristGuide
        fields = "__all__"
        read_only_fields = ("agency", "is_active", "created_at")

    def validate_contact_number(self, value):
        return normalize_ph_phone(value, "contact_number")

    def validate(self, attrs):
        attrs = super().validate(attrs)

        if 'languages' in attrs:
            attrs['languages'] = _normalize_string_list(attrs.get('languages'))

        if 'specializations' in attrs or 'specialization' in attrs:
            specializations, specialization = _resolve_specializations_payload(attrs, self.instance)
            attrs['specializations'] = specializations
            attrs['specialization'] = specialization

        return attrs

class AgencyApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Agency
        fields = ("status",)