from rest_framework import serializers #type: ignore
from .models import GuideReviewRequest, SystemAlert
from user_authentication.models import User, GuideApplication

class GuideApplicationSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuideReviewRequest
        fields = ['status', 'submission_date']
        read_only_fields = ['status', 'submission_date']


class AdminGuideReviewSerializer(serializers.ModelSerializer):
  
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='applicant.email', read_only=True)
    specialty = serializers.CharField(source='applicant.specialty', read_only=True)
    languages = serializers.JSONField(source='applicant.languages', read_only=True)
    
    credentials = serializers.SerializerMethodField()

    class Meta:
        model = GuideReviewRequest
        fields = [
            'id', 'name', 'email', 'specialty', 'languages', 
            'status', 'credentials', 'submission_date', 'admin_notes'
        ]
        read_only_fields = ['id', 'name', 'email', 'specialty', 'languages', 'credentials', 'submission_date']

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
    class Meta:
        model = SystemAlert
        fields = ['id', 'title', 'message', 'is_read', 'created_at', 'related_model', 'related_object_id']
        read_only_fields = ['created_at']

class CreateSystemAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemAlert
        fields = ['recipient', 'title', 'message', 'target_type', 'related_model', 'related_object_id']