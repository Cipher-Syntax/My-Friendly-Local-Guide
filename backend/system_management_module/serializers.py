from rest_framework import serializers #type: ignore
from .models import GuideReviewRequest, SystemAlert
from user_authentication.models import User, GuideApplication

# --- 1. Guide Application Submission Serializer ---
class GuideApplicationSubmissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuideReviewRequest
        fields = ['status', 'submission_date']
        read_only_fields = ['status', 'submission_date']


# --- 2. Admin Guide Review Serializer (Crucial for the Admin Dashboard) ---
class AdminGuideReviewSerializer(serializers.ModelSerializer):
    """
    Custom serializer to format data specifically for the React Admin Dashboard.
    Flattens the User and GuideApplication data into a single JSON object.
    """
    # Flatten User Info
    name = serializers.SerializerMethodField()
    email = serializers.EmailField(source='applicant.email', read_only=True)
    specialty = serializers.CharField(source='applicant.specialty', read_only=True)
    languages = serializers.JSONField(source='applicant.languages', read_only=True)
    
    # Construct Credentials Object with URLs
    credentials = serializers.SerializerMethodField()

    class Meta:
        model = GuideReviewRequest
        fields = [
            'id', 'name', 'email', 'specialty', 'languages', 
            'status', 'credentials', 'submission_date', 'admin_notes'
        ]
        # Only status and admin_notes should be editable by the admin here
        read_only_fields = ['id', 'name', 'email', 'specialty', 'languages', 'credentials', 'submission_date']

    def get_name(self, obj):
        # Returns "First Last" or "username"
        return obj.applicant.get_full_name() or obj.applicant.username

    def get_credentials(self, obj):
        """
        Builds the 'credentials' object expected by the React modal.
        Returns boolean status AND the full URL for the image.
        """
        try:
            # Access the related GuideApplication model
            app = obj.applicant.guide_application
            request = self.context.get('request')
            
            # Helper to build full URL (http://localhost:8000/media/...)
            def get_url(file_field):
                if file_field and hasattr(file_field, 'url'):
                    return request.build_absolute_uri(file_field.url)
                return None

            return {
                # URLs for viewing the image
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
            # Fallback if data is missing
            return {
                'certificate_url': None, 'residency_url': None, 'validId_url': None, 'nbiClearance_url': None,
                'certificate': False, 'residency': False, 'validId': False, 'nbiClearance': False,
            }

# --- 3. System Alert Serializer ---
class SystemAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemAlert
        fields = ['id', 'title', 'message', 'is_read', 'created_at', 'related_model', 'related_object_id']
        read_only_fields = ['created_at']

# --- 4. Create System Alert Serializer ---
class CreateSystemAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemAlert
        fields = ['recipient', 'title', 'message', 'target_type', 'related_model', 'related_object_id']