from rest_framework import generics, permissions #type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError #type: ignore
from django.core.mail import send_mail #type: ignore
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


class AgencyProfileView(generics.RetrieveUpdateAPIView):
    """Allows an Agency to view and update their profile (including downpayment settings)"""
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        if not hasattr(self.request.user, 'agency_profile'):
            raise PermissionDenied("You do not have an active agency profile.")
        return self.request.user.agency_profile


class AgencyRegisterView(generics.CreateAPIView):
    """Allows a User to create their Agency Profile"""
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    permission_classes = [permissions.IsAuthenticated] 

    def perform_create(self, serializer):
        user = self.request.user
        
        # Prevent duplicate agencies for the same user to avoid IntegrityError
        if Agency.objects.filter(user=user).exists():
            raise ValidationError({"detail": "An agency is already registered for this user account."})

        agency = serializer.save(user=user)

        admin_emails = User.objects.filter(is_superuser=True).values_list('email', flat=True)
        
        if admin_emails:
            plain_message = f"A new agency '{agency.business_name}' (Owner: {agency.owner_name}) has registered and is pending approval."
            html_message = f"""
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }}
                    .header {{ background-color: #0072FF; padding: 20px; text-align: center; color: #ffffff; font-size: 20px; font-weight: bold; }}
                    .content {{ padding: 30px; line-height: 1.6; font-size: 16px; color: #475569; }}
                    .highlight {{ font-weight: bold; color: #333; }}
                    .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">System Administrator Alert</div>
                    <div class="content">
                        <p>A new Agency has registered on the platform and is currently pending your review and approval.</p>
                        <ul>
                            <li><span class="highlight">Business Name:</span> {agency.business_name}</li>
                            <li><span class="highlight">Owner Name:</span> {agency.owner_name}</li>
                        </ul>
                        <p>Please log in to the admin dashboard to review the application and verify their submitted credentials.</p>
                    </div>
                    <div class="footer">&copy; 2026 LocaLynk Internal System.</div>
                </div>
            </body>
            </html>
            """
            
            send_mail(
                subject="New Agency Registration Request",
                message=plain_message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=list(admin_emails),
                fail_silently=True,
                html_message=html_message
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