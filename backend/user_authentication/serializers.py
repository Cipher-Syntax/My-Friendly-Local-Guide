from rest_framework import serializers #type: ignore
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer  #type: ignore
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone #type: ignore
from .models import FeaturedPlace, AccommodationImage, GuideApplication, FavoriteGuide
from .phone_utils import normalize_ph_phone
from personalization.serializers import PersonalizationSerializer
from agency_management_module.serializers import AgencySerializer
from backend.location_policy import validate_zds_location_payload

User = get_user_model()


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


def _resolve_specialties_payload(data, instance=None):
    has_specialties = 'specialties' in data
    has_specialty = 'specialty' in data

    existing_specialties = _normalize_string_list(getattr(instance, 'specialties', [])) if instance else []
    existing_specialty = str(getattr(instance, 'specialty', '') or '').strip() if instance else ''

    specialties = list(existing_specialties)
    specialty = existing_specialty

    if has_specialties:
        specialties = _normalize_string_list(data.get('specialties'))

    if has_specialty:
        incoming_specialty = str(data.get('specialty') or '').strip()
        specialty = incoming_specialty

        if incoming_specialty and not has_specialties:
            specialties = _normalize_string_list([incoming_specialty])

    if has_specialties and not has_specialty:
        specialty = specialties[0] if specialties else ''

    if has_specialty and not specialty and specialties:
        specialty = specialties[0]

    if specialty and not specialties:
        specialties = _normalize_string_list([specialty])

    return specialties, (specialty or None)

class FeaturedPlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeaturedPlace
        fields = ['id', 'image']
        
class AccommodationImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationImage
        fields = ['id', 'image']

class GuideApplicationSerializer(serializers.ModelSerializer):
    tour_guide_certificate = serializers.FileField(use_url=True)
    proof_of_residency = serializers.FileField(use_url=True)
    valid_id = serializers.FileField(use_url=True)
    nbi_clearance = serializers.FileField(use_url=True)

    class Meta:
        model = GuideApplication
        fields = ['tour_guide_certificate', 'proof_of_residency', 'valid_id', 'nbi_clearance']
    
    def validate(self, data):
        required_fields = ['tour_guide_certificate', 'proof_of_residency', 'valid_id', 'nbi_clearance']
        for field in required_fields:
            if not data.get(field):
                 raise serializers.ValidationError({field: f"Required."})
        return data


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=False, min_length=8)
    
    featured_places = FeaturedPlaceSerializer(many=True, read_only=True)
    accommodation_images = AccommodationImageSerializer(many=True, read_only=True)
    
    guide_application = GuideApplicationSerializer(read_only=True)
    
    has_pending_application = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    
    setup_progress = serializers.SerializerMethodField()
    personalization_profile = PersonalizationSerializer(read_only=True)
    
    agency_profile = AgencySerializer(read_only=True)
    is_staff = serializers.BooleanField(read_only=True)
    is_superuser = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'confirm_password', 'agency_profile',
            'first_name', 'middle_name', 'last_name', 'date_joined',
            'profile_picture', 'bio', 'phone_number',
            'payout_account_type', 'payout_account_name', 'payout_account_number', 'payout_account_notes',
            'location', 'municipality', 'latitude', 'longitude', 'valid_id_image', 'personalization_profile', 'is_active',
            'is_staff', 'is_superuser',
            
            'is_tourist', 'is_local_guide', 'guide_approved', 'has_accepted_terms',
            'push_enabled', 'email_enabled',
            'is_guide_visible', 

            'guide_tier', 'subscription_end_date',
            'guide_rating', 'experience_years', 'languages', 'specialties', 'specialty', 'tour_itinerary',
            'price_per_day', 'solo_price_per_day', 'multiple_additional_fee_per_head',
            'available_days', 'specific_available_dates',

            'featured_places', 'accommodation_images',
            
            'guide_application', 
            
            'has_pending_application', 'full_name',
            'setup_progress', 
        ]
        read_only_fields = ('guide_approved', 'date_joined', 'guide_rating')

    def get_has_pending_application(self, obj):
        try:
            return obj.guide_application.is_reviewed == False
        except GuideApplication.DoesNotExist:
            return False

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_setup_progress(self, obj):
        primary_specialty = str(obj.specialty or '').strip()
        specialty_list = _normalize_string_list(getattr(obj, 'specialties', []))
        has_specialty = bool(primary_specialty or specialty_list)

        has_info = bool(
            has_specialty and
            obj.price_per_day is not None
        )
        
        has_accommodation = obj.accommodations.exists()
        
        has_tour = obj.tours.exists()
        
        return {
            "has_info": has_info,
            "has_accommodation": has_accommodation,
            "has_tour": has_tour
        }

    def validate_username(self, value):
        queryset = User.objects.filter(username=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Username already exists')
        return value
    
    def validate_email(self, value):
        queryset = User.objects.filter(email=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Email already exists')
        return value

    def validate_phone_number(self, value):
        return normalize_ph_phone(value, "phone_number")
    
    def validate(self, data):
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        if password or confirm_password:
            if password != confirm_password:
                raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})

        if 'languages' in data:
            data['languages'] = _normalize_string_list(data.get('languages'))

        if 'specialties' in data or 'specialty' in data:
            specialties, specialty = _resolve_specialties_payload(data, self.instance)
            data['specialties'] = specialties
            data['specialty'] = specialty

        location_keys = {'location', 'municipality', 'latitude', 'longitude'}
        if any(key in data for key in location_keys):
            location = data.get('location', getattr(self.instance, 'location', None))
            municipality = data.get('municipality', getattr(self.instance, 'municipality', None))
            latitude = data.get('latitude', getattr(self.instance, 'latitude', None))
            longitude = data.get('longitude', getattr(self.instance, 'longitude', None))

            try:
                normalized = validate_zds_location_payload(
                    location=location,
                    municipality=municipality,
                    latitude=latitude,
                    longitude=longitude,
                    require_location=False,
                )
            except ValueError as exc:
                raise serializers.ValidationError({'location': str(exc)})

            data['location'] = normalized['location']
            data['municipality'] = normalized['municipality'] or None
            data['latitude'] = normalized['latitude']
            data['longitude'] = normalized['longitude']

        return data
    
    def create(self, validated_data):
        validated_data.pop('confirm_password', None)
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('confirm_password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user associated with this email.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data
    def save(self, user):
        password = self.validated_data['password']
        user.set_password(password)
        user.save()
        return user

class AdminTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['is_superuser'] = user.is_superuser
        return token
    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_superuser:
            raise serializers.ValidationError({"detail": "Restricted."})
        return data

class AgencyTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['is_staff'] = user.is_staff
        return token

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        password = attrs.get('password')
        
        user_exists = User.objects.filter(username=username).first()

        # 1. Intercept Deactivated Accounts ONLY if the password is correct
        if user_exists and user_exists.check_password(password):
            if user_exists.scheduled_deletion_date is not None:
                days_left = (user_exists.scheduled_deletion_date - timezone.now()).days
                msg = f"Account deactivated. Scheduled for deletion in {days_left} days."
                
                # Pass a simple string. The frontend's isDeactivatedError will catch it perfectly.
                raise AuthenticationFailed(msg)
            
            # 2. If it's inactive but NOT deactivated
            if not user_exists.is_active:
                raise AuthenticationFailed("User account is not active. Please verify your email.")

        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            raise AuthenticationFailed('Invalid Credentials.')

        if self.user.is_superuser:
            raise AuthenticationFailed('Admin accounts must sign in through the Admin Portal.')

        if self.user.is_local_guide and not hasattr(self.user, 'agency_profile'):
            raise AuthenticationFailed('Tour guide accounts cannot sign in through the Agency Portal.')
            
        # FIX: Removed the strict "Access Denied" block here. 
        # The frontend AgencySignin.jsx now handles kicking out normal users, 
        # allowing incomplete agencies to access the "Complete Profile" page.
            
        return data

class FavoriteGuideSerializer(serializers.ModelSerializer):
    class Meta:
        model = FavoriteGuide
        fields = ['id', 'user', 'guide', 'created_at']
        read_only_fields = ['user', 'created_at']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        return token

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        
        user_exists = User.objects.filter(username=username).first()
        
        if user_exists:
            if user_exists.scheduled_deletion_date is not None:
                days_left = (user_exists.scheduled_deletion_date - timezone.now()).days
                msg = f"Account deactivated. Scheduled for deletion in {days_left} days."
                
                raise AuthenticationFailed({
                    "detail": msg, 
                    "code": "account_deactivated",
                    "scheduled_date": user_exists.scheduled_deletion_date
                })

        if username and not user_exists:
            raise AuthenticationFailed('User not found.')

        try:
            data = super().validate(attrs)
        except AuthenticationFailed:
            raise AuthenticationFailed('Invalid Credentials.')

        if self.user.is_superuser:
            raise AuthenticationFailed('Admin accounts must sign in through the Admin Portal.')

        if self.user.is_staff or hasattr(self.user, 'agency_profile'):
            raise AuthenticationFailed('Agency accounts must sign in through the Agency Portal.')
            
        return data