from rest_framework import serializers #type: ignore
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer #type: ignore
from .models import FeaturedPlace, AccommodationImage, GuideApplication

User = get_user_model()

class FeaturedPlaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeaturedPlace
        fields = ['id', 'image']
        
class AccommodationImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationImage
        fields = ['id', 'image']

class GuideApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuideApplication
        fields = ['tour_guide_certificate', 'proof_of_residency', 'valid_id', 'nbi_clearance']
    def validate(self, data):
        required_fields = ['tour_guide_certificate', 'proof_of_residency', 'valid_id', 'nbi_clearance']
        for field in required_fields:
            if not data.get(field):
                 raise serializers.ValidationError({field: f"Required."})
        return data

# --- MAIN USER SERIALIZER ---

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=False, min_length=8)
    
    featured_places = FeaturedPlaceSerializer(many=True, read_only=True)
    accommodation_images = AccommodationImageSerializer(many=True, read_only=True)
    has_pending_application = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'confirm_password',
            'first_name', 'middle_name', 'last_name', 'date_joined',
            'profile_picture', 'bio', 'phone_number', 'location', 'valid_id_image',
            
            'is_tourist', 'is_local_guide', 'guide_approved',
            
            'is_guide_visible', 

            'guide_tier', 'subscription_end_date',
            'guide_rating', 'experience_years', 'languages', 'specialty', 'tour_itinerary',
            'price_per_day', 'solo_price_per_day', 'multiple_additional_fee_per_head',
            'available_days', 'specific_available_dates',

            'featured_places', 'accommodation_images',
            'has_pending_application', 'full_name',
        ]
        read_only_fields = ('guide_approved', 'date_joined', 'guide_rating')

    def get_has_pending_application(self, obj):
        try:
            return obj.guide_application.is_reviewed == False
        except GuideApplication.DoesNotExist:
            return False

    def get_full_name(self, obj):
        return obj.get_full_name()

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
        data = super().validate(attrs)
        if not self.user.is_staff:
            raise serializers.ValidationError({"detail": "Restricted."})
        return data