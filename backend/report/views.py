from rest_framework import viewsets, generics, permissions, status #type: ignore
from rest_framework.decorators import action #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import PermissionDenied #type: ignore
from .models import Report
from .serializers import ReportSerializer
from system_management_module.models import SystemAlert
from system_management_module.services.push_notifications import send_push_to_user, build_alert_push_data


class ReportCreateView(generics.CreateAPIView):
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)



class ReportAdminViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Report.objects.all().select_related('reporter', 'reported_user').order_by('-timestamp')
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAdminUser]

    @action(detail=True, methods=['post'])
    def warn(self, request, pk=None):
        report = self.get_object()
        user_to_warn = report.reported_user
        
        warning_message = request.data.get('message', f"You have received a warning regarding a report: {report.reason}")

        SystemAlert.objects.create(
            recipient=user_to_warn,
            target_type='Guide' if user_to_warn.is_local_guide else 'Tourist',
            title="Content Warning",
            message=warning_message,
            related_object_id=report.id,
            related_model='Report'
        )

        send_push_to_user(
            user=user_to_warn,
            title='Content Warning',
            body=warning_message,
            data=build_alert_push_data(
                alert_type='content_warning',
                related_model='Report',
                related_object_id=report.id,
            ),
            event_key=f"report-warning:{report.id}",
        )

        return Response({'status': 'Warning sent successfully'}, status=status.HTTP_200_OK)