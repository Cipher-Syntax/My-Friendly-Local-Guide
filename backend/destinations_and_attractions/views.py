from rest_framework import viewsets, permissions, generics, status #type: ignore
from rest_framework.response import Response #type: ignore
from .models import Destination, Attraction
from .serializers import DestinationSerializer, DestinationListSerializer, AttractionSerializer

# --- Custom Permission (Assuming you'll place this in a permissions.py file later) ---
class IsGuideOrReadOnly(permissions.BasePermission):
    """Custom permission to only allow approved local guides to create/edit."""
    def has_permission(self, request, view):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        # Write permissions are only allowed to approved guides
        return request.user.is_authenticated and request.user.is_local_guide and request.user.guide_approved
# --------------------------------------------------------------------------------------


class DestinationViewSet(viewsets.ModelViewSet):
    """
    CRUD for Destinations.
    List/Retrieve for everyone. Create/Update/Delete only for approved guides.
    """
    # Prefetch related data for efficiency on detail views
    queryset = Destination.objects.all().prefetch_related('images', 'attractions', 'creator') 
    
    # Use the custom permission
    permission_classes = [IsGuideOrReadOnly] 

    def get_serializer_class(self):
        # Switch to the lean serializer for listing destinations
        if self.action == 'list':
            return DestinationListSerializer
        # Use the detailed serializer for detail, create, update
        return DestinationSerializer
        
    def perform_create(self, serializer):
        # Automatically assign the creator field to the currently authenticated guide
        serializer.save(creator=self.request.user)
        
    # We don't need to explicitly handle retrieval or updating of nested images/attractions 
    # here, as those are read-only fields handled by the serializer.
    # CRUD for images/attractions should be done via separate dedicated views.


class AttractionViewSet(viewsets.ModelViewSet):
    """
    CRUD for Attractions.
    List/Retrieve for everyone. Create/Update/Delete only for approved guides.
    """
    queryset = Attraction.objects.all()
    serializer_class = AttractionSerializer
    permission_classes = [IsGuideOrReadOnly]
    
    # Note: When creating/updating an Attraction, the 'destination' field must be provided in the request body.


class DestinationAttractionListView(generics.ListAPIView):
    """
    Lists Attractions belonging to a specific Destination.
    Accessed via: /api/destinations/<destination_pk>/attractions/
    """
    serializer_class = AttractionSerializer
    permission_classes = [permissions.AllowAny] # Allow anyone to see attractions

    def get_queryset(self):
        destination_pk = self.kwargs['destination_pk']
        # Filter attractions by the destination ID provided in the URL
        return Attraction.objects.filter(destination__pk=destination_pk)