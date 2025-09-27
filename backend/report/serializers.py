from rest_framework import serializers #type: ignore
from .models import Report
from user_authentication.models import User

class ReportSerializer(serializers.ModelSerializer):
    reporter = serializers.PrimaryKeyRelatedField(read_only=True)
    reported_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Report
        fields = ['id', 'reporter', 'reported_user', 'reason', 'timestamp']
        read_only_fields = ['timestamp']

    def validate(self, data):
        reporter = self.context['request'].user
        reported = data.get('reported_user')
        if reporter.pk == reported.pk:
            raise serializers.ValidationError("You cannot report yourself.")
        return data
