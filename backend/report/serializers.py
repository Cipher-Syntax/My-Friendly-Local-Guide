from rest_framework import serializers #type: ignore
from .models import Report
from django.contrib.auth import get_user_model

User = get_user_model()

class ReportSerializer(serializers.ModelSerializer):
    """
    Serializer for submitting and reading user reports.
    """
    
    # Read-only fields for display
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reported_username = serializers.CharField(source='reported_user.username', read_only=True)
    
    # Primary key fields (maintaining your structure)
    # Reporter is read-only (set by request.user)
    reporter = serializers.PrimaryKeyRelatedField(read_only=True)
    
    # Reported user is writable (user selects who they report)
    reported_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reporter_username', 
            'reported_user', 'reported_username', 
            'reason', 'timestamp'
        ]
        read_only_fields = ['timestamp', 'reporter_username', 'reported_username'] # Added display fields here

    def validate(self, data):
        # Your custom self-reporting validation logic
        reporter = self.context['request'].user
        reported = data.get('reported_user')
        
        # 1. Prevent reporting self
        if reporter.pk == reported.pk:
            raise serializers.ValidationError({"reported_user": "You can't report yourself."})
            
        # 2. Check reason content
        if not data.get('reason') or not data.get('reason').strip():
             raise serializers.ValidationError({"reason": "A reason for the report is required."})

        return data