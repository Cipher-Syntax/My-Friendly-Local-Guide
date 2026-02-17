from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str 
from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponse, HttpResponseRedirect # <--- Added HttpResponseRedirect
from django.utils import timezone 
from datetime import timedelta 

from rest_framework import viewsets, generics, permissions, status 
from rest_framework.response import Response 
from rest_framework.views import APIView 
from rest_framework.exceptions import PermissionDenied, ValidationError 
from rest_framework_simplejwt.views import TokenObtainPairView 
from system_management_module.models import SystemAlert

from .serializers import (
    UserSerializer, 
    ForgotPasswordSerializer, 
    PasswordResetConfirmSerializer,
    GuideApplicationSerializer,
    AdminTokenObtainPairSerializer,
    AgencyTokenObtainPairSerializer,
    FavoriteGuideSerializer,
    CustomTokenObtainPairSerializer 
)
from .models import GuideApplication, FavoriteGuide
from .utils import verify_google_token
from rest_framework_simplejwt.tokens import RefreshToken 

User = get_user_model()

# --- FIXED: CUSTOM REDIRECT CLASS ---
# This allows Django to redirect to "localynk://" without throwing a security error
class CustomSchemeRedirect(HttpResponseRedirect):
    allowed_schemes = ['http', 'https', 'ftp', 'localynk']

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save(is_active=False) 
        
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        verify_link = f"{settings.BACKEND_BASE_URL}/api/verify-email/{uid}/{token}/"

        send_mail(
            subject="Verify your LocaLynk account",
            message=f"Hello {user.username},\n\nClick this link to verify your account:\n{verify_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )

# --- UPDATED VERIFY EMAIL VIEW ---
class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, uid, token):
        # FOR DEVELOPMENT BUILD (Custom APK)
        APP_SCHEME = "localynk://auth/login" 

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            # Using CustomSchemeRedirect to allow 'localynk://'
            return CustomSchemeRedirect(f"{APP_SCHEME}?status=error&message=Invalid link")

        if not default_token_generator.check_token(user, token):
            return CustomSchemeRedirect(f"{APP_SCHEME}?status=error&message=Expired token")

        user.is_active = True
        user.save()

        # Redirect to app with Success
        return CustomSchemeRedirect(f"{APP_SCHEME}?status=success&message=Email verified successfully")


class ResendVerificationEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        email = request.data.get('email')
        if not email:
            return Response({"detail": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({"detail": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)

        if user.is_active:
            return Response({"detail": "Account is already verified."}, status=status.HTTP_400_BAD_REQUEST)

        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        verify_link = f"{settings.BACKEND_BASE_URL}/api/verify-email/{uid}/{token}/"

        send_mail(
            subject="Verify your LocaLynk account",
            message=f"Hello {user.username},\n\nClick this link to verify your account:\n{verify_link}",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return Response({"detail": "Verification email resent successfully. Please check your inbox."}, status=status.HTTP_200_OK)


class UpdateUserView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user

class AdminUpdateUserView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    lookup_field = 'pk'

    def perform_update(self, serializer):
        user_instance = serializer.save()

        if 'is_active' in self.request.data:
            new_status = self.request.data['is_active']
            if user_instance.is_active != new_status:
                user_instance.is_active = new_status
                user_instance.save()
                try:
                    status_msg = "reactivated" if new_status else "restricted"
                    SystemAlert.objects.create(
                        target_type=user_instance.type if hasattr(user_instance, 'type') else 'Tourist',
                        recipient=user_instance,
                        title=f"Account {status_msg.capitalize()}",
                        message=f"Your account has been {status_msg} by an administrator."
                    )
                except Exception as e:
                    print(f"Could not send alert: {e}")

class PasswordResetAppRedirectView(APIView):
    """
    Renders a simple HTML page that attempts to open the app via JS
    and provides a manual button fallback.
    It is configured for EXPO GO usage (exp://).
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request, uid, token):
        # NOTE: If you are using Development Build for password reset too, 
        # you might want to change this to your local IP: 10.138.121.101
        # EXPO_IP = "192.168.137.89" 
        # app_scheme_url = f"exp://{EXPO_IP}:8081/--/auth/resetPassword?uid={uid}&token={token}"
        
        app_scheme_url = f"localynk://auth/resetPassword?uid={uid}&token={token}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Redirecting...</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body {{
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    text-align: center;
                    padding: 40px 20px;
                    background-color: #f8f9fa;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    box-sizing: border-box;
                }}
                .btn {{
                    display: inline-block;
                    background-color: #0072FF;
                    color: white;
                    padding: 15px 30px;
                    text-decoration: none;
                    border-radius: 25px;
                    font-weight: bold;
                    font-size: 16px;
                    margin-top: 20px;
                    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                    transition: background-color 0.3s;
                }}
                .btn:hover {{ background-color: #005bb5; }}
                h2 {{ color: #333; margin-bottom: 10px; }}
                p {{ color: #666; margin-bottom: 5px; font-size: 14px; }}
                .debug {{ 
                    margin-top: 30px; 
                    padding: 10px; 
                    background: #eee; 
                    border-radius: 5px; 
                    font-family: monospace; 
                    font-size: 12px;
                    color: #555;
                    word-break: break-all;
                }}
            </style>
        </head>
        <body>
            <h2>Opening LocaLynk...</h2>
            <p>We are trying to open the app to reset your password.</p>
            <p>If nothing happens automatically, click the button below:</p>
            
            <a href="{{app_scheme_url}}" class="btn">Open App & Reset Password</a>
            
            <div class="debug">
                Trying to open: {app_scheme_url}
            </div>

            <script>
                setTimeout(function() {{
                    window.location.href = "{app_scheme_url}";
                }}, 500);
            </script>
        </body>
        </html>
        """
        return HttpResponse(html_content)

class PasswordResetRequestView(generics.GenericAPIView):
    serializer_class = ForgotPasswordSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.objects.get(email=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        redirect_link = f"{settings.BACKEND_BASE_URL}/api/password-reset/redirect/{uid}/{token}/"

        plain_message = (
            f"Hi {user.username},\n\n"
            f"We received a request to reset your password. Click the link below to open the app:\n"
            f"{redirect_link}\n\n"
            f"--- OR MANUALLY ENTER CODES ---\n"
            f"If the link doesn't work, enter these details in the app:\n\n"
            f"UID: {uid}\n"
            f"Token: {token}\n\n"
            f"If you didn't request this, ignore this email."
        )

        html_message = f"""
        <html>
            <body style="font-family: Arial, sans-serif; color: #333;">
                <p>Hi {user.username},</p>
                <p>We received a request to reset your password.</p>
                
                <p>
                    <a href="{redirect_link}" style="background-color: #0072FF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Reset Password (Open App)
                    </a>
                </p>
                
                <br>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                
                <p><strong>If the button doesn't work, please manually enter these codes in the app:</strong></p>
                
                <div style="background-color: #f4f6f8; padding: 15px; border-radius: 8px; border: 1px solid #e1e4e8; display: inline-block; min-width: 250px;">
                    <p style="margin: 5px 0; font-size: 14px;"><strong>UID:</strong></p>
                    <p style="margin: 0 0 10px 0; font-family: monospace; font-size: 18px; color: #0072FF; background: #fff; padding: 5px; border: 1px solid #ddd; border-radius: 4px;">{uid}</p>
                    
                    <p style="margin: 5px 0; font-size: 14px;"><strong>Token:</strong></p>
                    <p style="margin: 0; font-family: monospace; font-size: 18px; color: #0072FF; background: #fff; padding: 5px; border: 1px solid #ddd; border-radius: 4px; word-break: break-all;">{token}</p>
                </div>

                <br><br>
                <p><small style="color: #888;">If you didn't request this, please ignore this email.</small></p>
            </body>
        </html>
        """

        send_mail(
            subject="Reset Your Password",
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
            html_message=html_message 
        )
        return Response({"detail": f"Password reset email sent to {email}."})


class PasswordResetConfirmView(generics.GenericAPIView):
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, uid=None, token=None, *args, **kwargs):
        uid = uid or request.data.get('uid')
        token = token or request.data.get('token')

        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Invalid user or UID."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)

        return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)

class AdminTokenObtainPairView(TokenObtainPairView):
    serializer_class = AdminTokenObtainPairSerializer

# NEW: View for custom login
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class ApplyAsGuideView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        if user.is_local_guide:
            return Response(
                {"detail": "You have already applied as a local guide. Status is pending or approved."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.apply_as_guide() 
        return Response(
            {"detail": "Application role flag set successfully. Please submit documents.",
             "is_local_guide": user.is_local_guide,
             "guide_approved": user.guide_approved},
            status=status.HTTP_200_OK
        )


class GuideApplicationSubmissionView(generics.CreateAPIView):
    serializer_class = GuideApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        if GuideApplication.objects.filter(user=user, is_reviewed=False).exists():
            raise ValidationError({"detail": "You already have a pending guide application awaiting review."})
        if user.is_local_guide and user.guide_approved:
            raise PermissionDenied("You are already an approved local guide.")
        application = serializer.save(user=user)
        if not user.is_local_guide:
            user.apply_as_guide()
        
        # Notify Admins via Email
        admin_emails = User.objects.filter(is_superuser=True).values_list('email', flat=True)
        if admin_emails:
            send_mail(
                subject="New Individual Guide Application Submitted",
                message=f"A new individual guide application has been submitted by {user.username} ({user.email}) and is pending review.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=list(admin_emails),
                fail_silently=True,
            )

        return Response(
            {"detail": "Documents submitted successfully. Awaiting admin review.",
             "application_id": application.id},
            status=status.HTTP_201_CREATED
        )
class ApprovedLocalGuideListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny] 
    
    def get_queryset(self):
        return User.objects.filter(
            is_local_guide=True, 
            guide_approved=True,
            scheduled_deletion_date__isnull=True
        ).order_by('-guide_rating')

class GuideDetailView(generics.RetrieveAPIView):
    queryset = User.objects.filter(
        is_local_guide=True, 
        guide_approved=True,
        scheduled_deletion_date__isnull=True
    )
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class AgencyListView(generics.ListAPIView):
    queryset = User.objects.filter(is_staff=True)
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class UpdateGuideInfoView(generics.UpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        user = self.request.user
        if not user.is_local_guide:
            raise PermissionDenied("Only local guides can update guide info.")
        return user

    def partial_update(self, request, *args, **kwargs):
        data = request.data.copy()

        if 'experience' in data:
            data['experience_years'] = data.pop('experience')

        if 'price' in data:
            data['price_per_day'] = data.pop('price')
        
        if 'specific_dates' in data:
            data['specific_available_dates'] = data.pop('specific_dates')
        
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)

class AgencyTokenObtainPairView(TokenObtainPairView):
    serializer_class = AgencyTokenObtainPairSerializer

class AcceptTermsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        if not user.has_accepted_terms:
            user.has_accepted_terms = True
            user.save(update_fields=['has_accepted_terms'])
        return Response({"detail": "Terms and conditions accepted successfully."}, status=status.HTTP_200_OK)

class ToggleFavoriteGuideView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        guide_id = request.data.get('guide_id')
        if not guide_id:
            return Response({"detail": "Guide ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        guide = get_object_or_404(User, pk=guide_id, is_local_guide=True)
        user = request.user

        favorite, created = FavoriteGuide.objects.get_or_create(user=user, guide=guide)
        
        if not created:
            favorite.delete()
            return Response({"detail": "Guide removed from favorites.", "is_favorite": False}, status=status.HTTP_200_OK)
        
        return Response({"detail": "Guide added to favorites.", "is_favorite": True}, status=status.HTTP_201_CREATED)

class FavoriteGuideListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Return the actual guide objects
        return User.objects.filter(favorites_received__user=user)
    
class GoogleLoginAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        token = request.data.get("token")
        if not token:
            return Response({"detail": "Token is required"}, status=status.HTTP_400_BAD_REQUEST)
            
        user = verify_google_token(token)

        if user is None:
            return Response({"detail": "Invalid Google token"}, status=status.HTTP_401_UNAUTHORIZED)

        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user.username # Or serialize the user object if needed
        })

# --- ACCOUNT DEACTIVATION VIEWS ---
class DeactivateAccountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        # Schedule deletion for 30 days from now
        user.scheduled_deletion_date = timezone.now() + timedelta(days=30)
        user.save()
        
        return Response({
            "detail": "Account deactivated. It will be permanently deleted in 30 days.",
            "deletion_date": user.scheduled_deletion_date
        }, status=status.HTTP_200_OK)

class ReactivateAccountView(APIView):
    permission_classes = [permissions.AllowAny] # Must be public since user can't log in

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({"detail": "Username and password required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return Response({"detail": "User not found."}, status=status.HTTP_404_NOT_FOUND)

        if not user.check_password(password):
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)

        if user.scheduled_deletion_date is None:
            return Response({"detail": "Account is not deactivated."}, status=status.HTTP_400_BAD_REQUEST)

        # Reactivate
        user.scheduled_deletion_date = None
        user.save()

        # Generate tokens immediately so they are logged in
        refresh = RefreshToken.for_user(user)
        return Response({
            "detail": "Account reactivated successfully.",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": user.username
        }, status=status.HTTP_200_OK)