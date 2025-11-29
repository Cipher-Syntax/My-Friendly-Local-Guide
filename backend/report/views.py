from rest_framework import viewsets, generics, permissions, status #type: ignore
from rest_framework.decorators import action #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import PermissionDenied #type: ignore
from .models import Report
from .serializers import ReportSerializer
from system_management_module.models import SystemAlert

# --- 1. Submission View (For Authenticated Users) ---

class ReportCreateView(generics.CreateAPIView):
    """
    Allows any authenticated user to submit a new report.
    """
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


# --- 2. Administrative View (For Staff/Admin Review) ---

class ReportAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Allows staff/admins to view reports and take action.
    """
    queryset = Report.objects.all().select_related('reporter', 'reported_user').order_by('-timestamp')
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAdminUser]

    # 🔥 NEW: Action to Send a Warning
    @action(detail=True, methods=['post'])
    def warn(self, request, pk=None):
        report = self.get_object()
        user_to_warn = report.reported_user
        
        warning_message = request.data.get('message', f"You have received a warning regarding a report: {report.reason}")

        # Create the alert
        SystemAlert.objects.create(
            recipient=user_to_warn,
            target_type='Guide' if user_to_warn.is_local_guide else 'Tourist',
            title="Content Warning",
            message=warning_message,
            related_object_id=report.id,
            related_model='Report'
        )

        return Response({'status': 'Warning sent successfully'}, status=status.HTTP_200_OK)