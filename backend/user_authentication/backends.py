# your_app/backends.py
from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model
from rest_framework.exceptions import PermissionDenied #type: ignore

User = get_user_model()

class CustomAuthBackend(ModelBackend):
    def authenticate(self, request, username=None, password=None, **kwargs):
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            return None
        
        # Check password
        if user.check_password(password):
            if not user.is_active:
                raise PermissionDenied("User account is not active. Please verify your email.")
            return user
        
        return None