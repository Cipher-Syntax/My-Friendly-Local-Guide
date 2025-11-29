from rest_framework import generics, permissions #type: ignore
from rest_framework.exceptions import PermissionDenied #type: ignore
from .models import Agency, TouristGuide
from .serializers import AgencySerializer, AgencyApprovalSerializer, TouristGuideSerializer

# --- AGENCY VIEWS ---

class AgencyListView(generics.ListAPIView):
    """
    Returns ALL agencies. 
    Used by: Admin Panel (to approve) and Mobile App (to select agency).
    """
    # Show all agencies (Admin filters pending, App filters approved)
    queryset = Agency.objects.all().order_by('-created_at')
    serializer_class = AgencySerializer
    permission_classes = [permissions.AllowAny] # Accessible by Admin & Tourists

class AgencyRegisterView(generics.CreateAPIView):
    """Allows a User to create their Agency Profile"""
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAuthenticated] 

    def perform_create(self, serializer):
        # Link the new Agency profile to the currently logged-in User
        serializer.save(user=self.request.user)

class AgencyApproveView(generics.UpdateAPIView):
    """Admin view to approve agencies"""
    queryset = Agency.objects.all()
    serializer_class = AgencyApprovalSerializer
    permission_classes = [permissions.IsAdminUser]

# --- TOURIST GUIDE VIEWS (Agency Employees) ---

class TouristGuideCreateView(generics.CreateAPIView):
    """Allows an Agency to add a new Employee Guide"""
    serializer_class = TouristGuideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'agency_profile'):
            raise PermissionDenied("You must be a registered Agency to add guides.")
            
        agency = self.request.user.agency_profile
        if not agency.is_approved:
            raise PermissionDenied("Your agency must be approved before adding guides.")
            
        serializer.save(agency=agency)

class TouristGuideListView(generics.ListAPIView):
    """Returns ONLY the guides belonging to the logged-in Agency"""
    serializer_class = TouristGuideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'agency_profile'):
            return TouristGuide.objects.filter(agency=self.request.user.agency_profile)
        return TouristGuide.objects.none()

# 🔥 NEW: Add this view for Deleting/Updating Guides
class TouristGuideDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TouristGuideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Ensure users can only edit/delete their OWN agency's guides
        if hasattr(self.request.user, 'agency_profile'):
            return TouristGuide.objects.filter(agency=self.request.user.agency_profile)
        return TouristGuide.objects.none()