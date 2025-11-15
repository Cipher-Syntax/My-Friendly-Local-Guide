from rest_framework import serializers #type: ignore
from .models import GuideReviewRequest, SystemAlert
from user_authentication.models import User

# --- 1. Guide Application Submission/Creation ---

class GuideApplicationSubmissionSerializer(serializers.ModelSerializer):
    """
    Serializer used by the frontend when a user first submits their application.
    This creates the initial GuideReviewRequest record (Status: Pending).
    
    The 'applicant' field is made read-only and will be supplied by the View.
    """
    # The applicant is the current user, so we make it read-only for incoming data
    # and use the hidden fields to carry the attached documents.
    
    # We will exclude 'applicant' from the fields list and handle it in create/save.
    
    class Meta:
        model = GuideReviewRequest
        # We only need fields that are NOT automatically generated/populated
        fields = ['status', 'submission_date'] # Exclude applicant here
        read_only_fields = ['status', 'submission_date'] 

    # We skip the create method here and rely on the ViewSet to pass the user instance
    # via the `perform_create` method.

# --- 2. Admin Review/Update Serializer (Unchanged) ---

class GuideReviewUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer used by Admin dashboard to approve or reject a guide.
    """
    class Meta:
        model = GuideReviewRequest
        fields = ['status', 'admin_notes', 'reviewed_by']
        read_only_fields = ['reviewed_notes', 'reviewed_by'] 

# --- 3. System Alert Read Serializer (Unchanged) ---

class SystemAlertSerializer(serializers.ModelSerializer):
    """
    Serializer for exposing and updating user alerts.
    """
    class Meta:
        model = SystemAlert
        fields = ['id', 'title', 'message', 'is_read', 'created_at', 'related_model', 'related_object_id']
        read_only_fields = ['title', 'message', 'created_at', 'related_model', 'related_object_id']