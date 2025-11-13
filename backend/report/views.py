from rest_framework import viewsets, generics, permissions, status #type: ignore
from rest_framework.exceptions import PermissionDenied #type: ignore
from .models import Report
from .serializers import ReportSerializer

# --- 1. Submission View (For Authenticated Users) ---

class ReportCreateView(generics.CreateAPIView):
    """
    Allows any authenticated user to submit a new report.
    This replaces the ModelViewSet's POST capability for users.
    """
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # The serializer handles validation (preventing self-report)
        # We automatically assign the current user as the reporter
        serializer.save(reporter=self.request.user)


# --- 2. Administrative View (For Staff/Admin Review) ---

class ReportAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Allows staff/admins to view the history and details of all submitted reports.
    Uses ReadOnlyModelViewSet to prevent accidental deletion or modification by admin.
    """
    # Order by newest first
    queryset = Report.objects.all().select_related('reporter', 'reported_user').order_by('-timestamp')
    serializer_class = ReportSerializer
    
    # CRUCIAL: Only allow Django Staff/Superusers to access this list
    permission_classes = [permissions.IsAdminUser]