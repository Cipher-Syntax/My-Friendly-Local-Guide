from rest_framework import serializers #type: ignore
from .models import Report
from django.contrib.auth import get_user_model

User = get_user_model()

class ReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    reported_username = serializers.CharField(source='reported_user.username', read_only=True)
    reported_user_is_active = serializers.BooleanField(source='reported_user.is_active', read_only=True)
    reported_user_type = serializers.SerializerMethodField()
    
    reporter = serializers.PrimaryKeyRelatedField(read_only=True)
    
    reported_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Report
        fields = [
            'id', 'reporter', 'reporter_username', 
            'reported_user', 'reported_username', 
            'reason', 'timestamp', 'reported_user_is_active',
            'reported_user_type'
        ]
        read_only_fields = ['timestamp', 'reporter_username', 'reported_username', 'reported_user_is_active', 'reported_user_type']

    def get_reported_user_type(self, obj):
        if obj.reported_user.is_local_guide:
            return 'Guide'
        elif obj.reported_user.is_staff:
            return 'Agency'
        else:
            return 'Tourist'

    def validate(self, data):
        reporter = self.context['request'].user
        reported = data.get('reported_user')
        
        if reporter.pk == reported.pk:
            raise serializers.ValidationError({"reported_user": "You can't report yourself."})
            
        if not data.get('reason') or not data.get('reason').strip():
             raise serializers.ValidationError({"reason": "A reason for the report is required."})

        return data