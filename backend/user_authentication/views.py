from django.contrib.auth import get_user_model
User = get_user_model()

from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, generics, permissions, status #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError #type: ignore
from .serializers import (
    UserSerializer, ForgotPasswordSerializer, PasswordResetConfirmSerializer,
    GuideApplicationSerializer # <-- NEW Import
)
from .models import GuideApplication # <-- NEW Import
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str 
from django.core.mail import send_mail
from django.conf import settings

# Create your views here.
User = get_user_model()

# --- User & Authentication Views (Existing) ---

# class CreateUserView(generics.CreateAPIView):
#     """Handles user registration (default tourist role)."""
#     queryset = User.objects.all().order_by('-date_joined')
#     serializer_class = UserSerializer
#     permission_classes = [permissions.AllowAny]
class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save(is_active=False)  # user disabled until email is verified
        
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

        # Generate new token and send email
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
    """Allows an authenticated user to view/update their own profile."""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
class PasswordResetRequestView(generics.GenericAPIView):
    """Handles sending a password reset email."""
    serializer_class = ForgotPasswordSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        user = User.objects.get(email=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        reset_link = f"{settings.BACKEND_BASE_URL}/api/reset-password/{uid}/{token}/"

        send_mail(
            subject="Reset Your Password",
            message=f"Hi {user.username},\n\nClick this link to reset your password:\n{reset_link}\n\nIf you didn't request this, ignore this email.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
        return Response({"detail": f"Password reset email sent to {email}."})


class PasswordResetConfirmView(generics.GenericAPIView):
    """Handles resetting the password using the token and UID."""
    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, uid=None, token=None, *args, **kwargs):
        try:
            uid_decoded = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=uid_decoded)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            return Response({"detail": "Invalid user."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({"detail": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=user)

        return Response({"detail": "Password has been reset successfully."}, status=status.HTTP_200_OK)

# --- Guide-Specific Views (Role Change) ---

class ApplyAsGuideView(APIView):
    """
    Allows an authenticated user (tourist) to simply trigger the role change flag.
    Documents should be submitted via GuideApplicationSubmissionView.
    """
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

# --- Guide-Specific Views (Document Submission) ---

class GuideApplicationSubmissionView(generics.CreateAPIView):
    """
    Handles the submission of guide application documents by an authenticated user.
    """
    serializer_class = GuideApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user

        # 1. Prevent duplicate submissions
        if GuideApplication.objects.filter(user=user, is_reviewed=False).exists():
            raise ValidationError({"detail": "You already have a pending guide application awaiting review."})
            
        if user.is_local_guide and user.guide_approved:
            raise PermissionDenied("You are already an approved local guide.")

        # 2. Create the application record, linking it to the user
        application = serializer.save(user=user)
        
        # 3. Update the user's role status (if not done previously)
        if not user.is_local_guide:
            user.apply_as_guide()
        
        # 4. Success Response
        return Response(
            {"detail": "Documents submitted successfully. Awaiting admin review.",
             "application_id": application.id},
            status=status.HTTP_201_CREATED
        )


class ApprovedLocalGuideListView(generics.ListAPIView):
    """
    Lists all local guides who have been approved by the admin.
    """
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny] 

    def get_queryset(self):
        return User.objects.filter(is_local_guide=True, guide_approved=True).order_by('-guide_rating')

class GuideDetailView(generics.RetrieveAPIView):
    """
    Fetches details of a single approved local guide.
    """
    queryset = User.objects.filter(is_local_guide=True, guide_approved=True)
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

class AgencyListView(generics.ListAPIView):
    """
    Lists all agencies (staff users).
    """
    queryset = User.objects.filter(is_staff=True)
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]



class UpdateGuideInfoView(generics.UpdateAPIView):
    """
    Allows an authenticated guide to update their guide-specific info:
    languages, specialty, tour itinerary, price, available days.
    """
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
            # If 'prefetch_related' has been used, we need to manually update the instance's cache.
            instance._prefetched_objects_cache = {}

        return Response(serializer.data)
