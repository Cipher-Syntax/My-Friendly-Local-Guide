from django.shortcuts import render, get_object_or_404, redirect
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str 
from django.core.mail import send_mail
from django.conf import settings
from django.http import HttpResponse

from rest_framework import viewsets, generics, permissions, status # type: ignore
from rest_framework.response import Response # type: ignore
from rest_framework.views import APIView # type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError # type: ignore
from rest_framework_simplejwt.views import TokenObtainPairView # type: ignore
from system_management_module.models import SystemAlert

from .serializers import (
    UserSerializer, 
    ForgotPasswordSerializer, 
    PasswordResetConfirmSerializer,
    GuideApplicationSerializer,
    AdminTokenObtainPairSerializer,
    AgencyTokenObtainPairSerializer
)
from .models import GuideApplication

User = get_user_model()

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

class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, uid, token):
        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except:
            return Response({"detail": "Invalid link."}, status=400)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired token."}, status=400)

        user.is_active = True
        user.save()

        return Response({"detail": "Email verified successfully!"}, status=200)

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
        EXPO_IP = "192.168.137.89" 
        
        app_scheme_url = f"exp://{EXPO_IP}:8081/--/auth/resetPassword?uid={uid}&token={token}"
    
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
            
            <a href="{app_scheme_url}" class="btn">Open App & Reset Password</a>
            
            <div class="debug">
                Trying to open: {app_scheme_url}
            </div>

            <script>
                // Attempt to redirect automatically after a short delay
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

        plain_message = f"Hi {user.username},\n\nWe received a request to reset your password. Click the link below to open the app:\n{redirect_link}\n\nIf the link doesn't work, manually enter:\nUID: {uid}\nToken: {token}"

        html_message = f"""
        <html>
            <body>
                <p>Hi {user.username},</p>
                <p>We received a request to reset your password.</p>
                <p>
                    <a href="{redirect_link}" style="background-color: #0072FF; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password (Open App)
                    </a>
                </p>
                <p><small>If you didn't request this, ignore this email.</small></p>
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
        return Response(
            {"detail": "Documents submitted successfully. Awaiting admin review.",
             "application_id": application.id},
            status=status.HTTP_201_CREATED
        )

class ApprovedLocalGuideListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny] 
    def get_queryset(self):
        return User.objects.filter(is_local_guide=True, guide_approved=True).order_by('-guide_rating')

class GuideDetailView(generics.RetrieveAPIView):
    queryset = User.objects.filter(is_local_guide=True, guide_approved=True)
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