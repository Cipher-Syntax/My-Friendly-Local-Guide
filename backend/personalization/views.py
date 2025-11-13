from rest_framework import viewsets, permissions #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import NotFound #type: ignore
from .models import Personalization
from .serializers import PersonalizationSerializer
from django.shortcuts import get_object_or_404

class PersonalizationViewSet(viewsets.ModelViewSet):
    """
    Handles CRUD operations for the authenticated user's personalization profile.
    Only the logged-in user can view/edit their own profile.
    """
    # We keep this general, filtering happens in get_queryset/get_object
    queryset = Personalization.objects.all() 
    serializer_class = PersonalizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users should only access their own personalization
        return Personalization.objects.filter(user=self.request.user)

    def get_object(self):
        """
        Custom method to handle the OneToOne relationship. 
        It retrieves the user's profile or creates it automatically (Lazy Creation) 
        if the user attempts to retrieve (GET) or update (PUT/PATCH) it.
        """
        user = self.request.user
        try:
            return Personalization.objects.get(user=user)
        except Personalization.DoesNotExist:
            # Create a profile only if the action is retrieve/update (not list/create)
            if self.action in ['retrieve', 'update', 'partial_update']:
                return Personalization.objects.create(user=user)
            # Raise NotFound if this logic runs on an unsupported action (though Django handles this mostly)
            raise NotFound("Profile not found.")

    def perform_create(self, serializer):
        # This handles the POST request (Create action). 
        # We ensure a user doesn't create a second profile.
        if Personalization.objects.filter(user=self.request.user).exists():
            raise NotFound("Profile already exists. Use PUT/PATCH to update.")
        
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        # Allows the user to delete their profile
        instance.delete()