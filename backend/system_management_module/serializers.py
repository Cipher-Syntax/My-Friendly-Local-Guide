from rest_framework import serializers #type: ignore
from .models import GuideReviewRequest, SystemAlert, PushDeviceToken
from user_authentication.models import User, GuideApplication
from communication.models import Message


def _display_name_for_user(user):
    full_name = (user.get_full_name() or '').strip()
    if full_name:
        return full_name

    username = (getattr(user, 'username', '') or '').strip()
    if '@' in username:
        local = username.split('@', 1)[0].replace('.', ' ').replace('_', ' ').replace('-', ' ').strip()
        if local:
            return ' '.join(part.capitalize() for part in local.split())

    return username or 'User'

class GuideApplicationSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuideReviewRequest
        fields = ['status', 'submission_date']
        read_only_fields = ['status', 'submission_date']


class AdminGuideReviewSerializer(serializers.ModelSerializer):
  
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='applicant.email', read_only=True)
    phone_number = serializers.CharField(source='applicant.phone_number', read_only=True)
    specialty = serializers.CharField(source='applicant.specialty', read_only=True)
    languages = serializers.JSONField(source='applicant.languages', read_only=True)
    
    credentials = serializers.SerializerMethodField()

    class Meta:
        model = GuideReviewRequest
        fields = [
            'id', 'name', 'email', 'phone_number', 'specialty', 'languages', 
            'status', 'credentials', 'submission_date', 'admin_notes'
        ]
        read_only_fields = ['id', 'name', 'email', 'phone_number', 'specialty', 'languages', 'credentials', 'submission_date']

    def get_name(self, obj):
        return obj.applicant.get_full_name() or obj.applicant.username

    def get_credentials(self, obj):
        """
        Builds the 'credentials' object expected by the React modal.
        Returns boolean status AND the full URL for the image.
        """
        try:
            app = obj.applicant.guide_application
            request = self.context.get('request')
            
            def get_url(file_field):
                if file_field and hasattr(file_field, 'url'):
                    return request.build_absolute_uri(file_field.url)
                return None

            return {
                'certificate_url': get_url(app.tour_guide_certificate),
                'residency_url': get_url(app.proof_of_residency),
                'validId_url': get_url(app.valid_id),
                'nbiClearance_url': get_url(app.nbi_clearance),
                
                # Booleans for the checkmark badges
                'certificate': bool(app.tour_guide_certificate),
                'residency': bool(app.proof_of_residency),
                'validId': bool(app.valid_id),
                'nbiClearance': bool(app.nbi_clearance),
            }
        except GuideApplication.DoesNotExist:
            return {
                'certificate_url': None, 'residency_url': None, 'validId_url': None, 'nbiClearance_url': None,
                'certificate': False, 'residency': False, 'validId': False, 'nbiClearance': False,
            }

class SystemAlertSerializer(serializers.ModelSerializer):
    partner_id = serializers.SerializerMethodField()
    partner_name = serializers.SerializerMethodField()

    def _get_partner_from_message_alert(self, obj):
        if obj.related_model != 'Message' or not obj.related_object_id:
            return None

        try:
            message = Message.objects.select_related('sender', 'receiver').get(pk=obj.related_object_id)
        except Message.DoesNotExist:
            return None

        request = self.context.get('request')
        current_user = getattr(request, 'user', None)
        if not current_user or not getattr(current_user, 'is_authenticated', False):
            return message.sender

        if message.sender_id == current_user.id:
            return message.receiver
        if message.receiver_id == current_user.id:
            return message.sender
        return message.sender

    def get_partner_id(self, obj):
        partner = self._get_partner_from_message_alert(obj)
        return partner.id if partner else None

    def get_partner_name(self, obj):
        partner = self._get_partner_from_message_alert(obj)
        return _display_name_for_user(partner) if partner else None

    class Meta:
        model = SystemAlert
        fields = [
            'id',
            'title',
            'message',
            'is_read',
            'created_at',
            'related_model',
            'related_object_id',
            'partner_id',
            'partner_name',
        ]
        read_only_fields = ['created_at']

class CreateSystemAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemAlert
        fields = ['recipient', 'title', 'message', 'target_type', 'related_model', 'related_object_id']


class PushTokenRegisterSerializer(serializers.Serializer):
    expo_push_token = serializers.CharField(max_length=255)
    device_id = serializers.CharField(max_length=128, required=False, allow_blank=True, allow_null=True)
    platform = serializers.ChoiceField(
        choices=[choice[0] for choice in PushDeviceToken.PLATFORM_CHOICES],
        required=False,
        default='unknown'
    )
    app_version = serializers.CharField(max_length=50, required=False, allow_blank=True, allow_null=True)

    def validate_expo_push_token(self, value):
        if not value.startswith('ExponentPushToken[') and not value.startswith('ExpoPushToken['):
            raise serializers.ValidationError('Invalid Expo push token format.')
        return value


class PushTokenUnregisterSerializer(serializers.Serializer):
    expo_push_token = serializers.CharField(max_length=255)