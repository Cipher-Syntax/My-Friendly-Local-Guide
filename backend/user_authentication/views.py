from django.shortcuts import render, get_object_or_404
from rest_framework import viewsets, generics, permissions, status #type: ignore
from rest_framework.response import Response #type: ignore
from .serializers import UserSerializer, ForgotPasswordSerializer, PasswordResetConfirmSerializer
from django.contrib.auth import  get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_bytes
from django.utils.encoding import force_str 
from django.core.mail import send_mail
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView #type: ignore
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer #type: ignore
from rest_framework.exceptions import AuthenticationFailed #type: ignore
from django.conf import settings


# Create your views here.
User = get_user_model()

class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all().order_by('-date_joined')
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    
class UpdateUserView(generics.RetrieveUpdateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user
    
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
    
class CookieTokenObtainPairView(TokenObtainPairView):
    serializer_class = TokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        data = response.data
        access_token = data.get('access')
        refresh_token = data.get('refresh')
        
        response.set_cookie(
            key='access_token',
            value=access_token,
            httponly=True,
            secure=False,  # Change to True in production (https)
            samesite='Lax',
            max_age=60 * 5, 
        )
        response.set_cookie(
            key='refresh_token',
            value=refresh_token,
            httponly=True,
            secure=False, # Change to True in production (https)
            samesite='Lax',  # change to none if backend and frontend are deployed separatedly
            max_age=60 * 60 * 24 * 7,
        )

        return response
    
class CookieTokenRefreshView(TokenRefreshView):
    serializer_class = TokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get('refresh_token')

        if not refresh_token:
            raise AuthenticationFailed('Refresh token not found in cookies.')

        serializer = self.get_serializer(data={'refresh': refresh_token})
        serializer.is_valid(raise_exception=True)

        access_token = serializer.validated_data.get('access')
        response = Response({'access': access_token}, status=status.HTTP_200_OK)
        response.set_cookie(
            key='access_token',
            value=access_token,
            httponly=True,
            secure=False,  # change to True in production
            samesite='Lax', # change to none if backend and frontend are deployed separatedly
            max_age=60 * 5,
        )

        return response