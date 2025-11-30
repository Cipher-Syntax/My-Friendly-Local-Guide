from rest_framework import generics, permissions #type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError #type: ignore
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import Agency, TouristGuide
from .serializers import AgencySerializer, AgencyApprovalSerializer, TouristGuideSerializer

FREE_TIER_GUIDE_LIMIT = 2

User = get_user_model()


class AgencyListView(generics.ListAPIView):
    """
    Returns ALL agencies. 
    Used by: Admin Panel (to approve) and Mobile App (to select agency).
    """
    queryset = Agency.objects.all().order_by('-created_at')
    serializer_class = AgencySerializer
    permission_classes = [permissions.AllowAny]

class AgencyRegisterView(generics.CreateAPIView):
    """Allows a User to create their Agency Profile"""
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAuthenticated] 

    def perform_create(self, serializer):
        agency = serializer.save(user=self.request.user)

        admin_emails = User.objects.filter(is_superuser=True).values_list('email', flat=True)
        
        if admin_emails:
            send_mail(
                subject="New Agency Registration Request",
                message=f"A new agency '{agency.business_name}' (Owner: {agency.owner_name}) has registered and is pending approval.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=list(admin_emails),
                fail_silently=True,
            )

class AgencyApproveView(generics.UpdateAPIView):
    """Admin view to approve agencies"""
    queryset = Agency.objects.all()
    serializer_class = AgencyApprovalSerializer
    permission_classes = [permissions.IsAdminUser]


class TouristGuideCreateView(generics.CreateAPIView):
    """Allows an Agency to add a new Employee Guide"""
    serializer_class = TouristGuideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        
        if not hasattr(user, 'agency_profile'):
            raise PermissionDenied("You must be a registered Agency to add guides.")
            
        agency = user.agency_profile
        if not agency.is_approved:
            raise PermissionDenied("Your agency must be approved before adding guides.")
        
        if user.guide_tier == 'free':
            current_guide_count = TouristGuide.objects.filter(agency=agency).count()
            if current_guide_count >= FREE_TIER_GUIDE_LIMIT:
                 raise ValidationError(
                    {"detail": f"Free tier agencies are limited to {FREE_TIER_GUIDE_LIMIT} active guides. Please subscribe to add more."}
                 )
            
        serializer.save(agency=agency)

class TouristGuideListView(generics.ListAPIView):
    """Returns ONLY the guides belonging to the logged-in Agency"""
    serializer_class = TouristGuideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'agency_profile'):
            return TouristGuide.objects.filter(agency=self.request.user.agency_profile)
        return TouristGuide.objects.none()

class TouristGuideDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TouristGuideSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if hasattr(self.request.user, 'agency_profile'):
            return TouristGuide.objects.filter(agency=self.request.user.agency_profile)
        return TouristGuide.objects.none()