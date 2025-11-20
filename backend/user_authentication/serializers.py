from rest_framework import serializers #type: ignore
from django.contrib.auth import get_user_model
from .models import FeaturedPlace, AccommodationImage, GuideApplication # NEW Import

User = get_user_model()

# --- Nested Utility Serializers ---
class FeaturedPlaceSerializer(serializers.ModelSerializer):
    """Serializes the FeaturedPlace images."""
    class Meta:
        model = FeaturedPlace
        fields = ['id', 'image']
        
class AccommodationImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationImage
        fields = ['id', 'image']


# --- NEW: Guide Application Serializer ---

class GuideApplicationSerializer(serializers.ModelSerializer):
    """Handles validation and creation of a Guide Application, including document uploads."""
    class Meta:
        model = GuideApplication
        # Note: 'user' field is omitted; it is set by the View
        fields = [
            'tour_guide_certificate', 
            'proof_of_residency', 
            'valid_id', 
            'nbi_clearance',
        ]

    def validate(self, data):
        # Ensure all required documents are provided
        required_fields = ['tour_guide_certificate', 'proof_of_residency', 'valid_id', 'nbi_clearance']
        for field in required_fields:
            if not data.get(field):
                 raise serializers.ValidationError({field: f"The {field.replace('_', ' ')} is required for the application."})
        return data


# --- Main User Serializer ---

class UserSerializer(serializers.ModelSerializer):
    # Standard authentication fields
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=False, min_length=8)
    
    # Nested fields for related images (Read-only for GET requests)
    featured_places = FeaturedPlaceSerializer(many=True, read_only=True)
    accommodation_images = AccommodationImageSerializer(many=True, read_only=True)
    
    # Check if the user has an active application (Read-only for GET requests)
    has_pending_application = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            # User & Profile Fields
            'id', 'username', 'email', 'password', 'confirm_password',
            'first_name', 'last_name', 'date_joined',
            'profile_picture', 'bio', 'phone_number', 'location',
            
            # Role Fields
            'is_tourist', 'is_local_guide', 'guide_approved',
            
            # Guide Detail Fields
            'guide_rating', 'experience_years', 'languages', 'specialty',
            'price_per_day', 'solo_price_per_day', 'multiple_additional_fee_per_head',
            'available_days', 'specific_available_dates',

            # Nested Fields
            'featured_places', 'accommodation_images',
            'has_pending_application', 
        ]
        read_only_fields = ('guide_approved', 'date_joined', 'guide_rating')

    def get_has_pending_application(self, obj):
        """Checks if the user has a submitted application that hasn't been reviewed."""
        try:
            return obj.guide_application.is_reviewed == False
        except GuideApplication.DoesNotExist:
            return False

    # --- Validation and CRUD Methods (Unchanged) ---
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
    
    def validate(self, data):
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        if password or confirm_password:
            if password != confirm_password:
                raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
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

# --- Authentication Serializers (Unchanged) ---
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