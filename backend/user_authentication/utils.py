from google.oauth2 import id_token
from google.auth.transport import requests
from django.contrib.auth import get_user_model
from django.conf import settings
from rest_framework.exceptions import AuthenticationFailed

User = get_user_model()

GOOGLE_CLIENT_ID = settings.GOOGLE_CLIENT_ID

def verify_google_token(token):
    """
    Verify Google ID token and return a Django user.
    Creates a new user if none exists.
    """
    try:
        idinfo = id_token.verify_oauth2_token(token, requests.Request(), GOOGLE_CLIENT_ID)
        
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Wrong issuer.')

        email = idinfo.get("email")
        # Use name or fall back to part of email
        name = idinfo.get("name", email.split("@")[0]) 
        
        if not email:
            raise AuthenticationFailed("No email found in Google token")

        # Fetch existing user or create a new one
        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": email, # Use email as username to avoid conflicts
                "first_name": idinfo.get("given_name", ""),
                "last_name": idinfo.get("family_name", ""),
                "is_active": True,
                "is_tourist": True, # Default role
            }
        )
        
        return user

    except ValueError as e:
        print(f"Google Token Verification Error: {e}")
        return None