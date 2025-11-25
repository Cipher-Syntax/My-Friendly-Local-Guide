from rest_framework import viewsets, permissions, status, generics #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.parsers import MultiPartParser, FormParser #type: ignore
from django_filters.rest_framework import DjangoFilterBackend #type: ignore
from django.contrib.auth import get_user_model

from .models import Destination, Attraction, TourPackage, TourStop
from .serializers import (
    DestinationSerializer, 
    DestinationListSerializer, 
    AttractionSerializer,
    TourPackageSerializer,
    GuideSerializer
)

User = get_user_model()

# --- Permissions ---
class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff

class IsGuide(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'is_local_guide', False)

# --- 1. Global Destination & Attraction Views ---

class DestinationViewSet(viewsets.ModelViewSet):
    queryset = Destination.objects.all().prefetch_related('images', 'attractions')
    permission_classes = [IsAdminOrReadOnly]

    def get_serializer_class(self):
        if self.action == 'list':
            return DestinationListSerializer
        return DestinationSerializer

class AttractionViewSet(viewsets.ModelViewSet):
    """Restored ViewSet for managing Attractions via API/Admin"""
    queryset = Attraction.objects.all()
    serializer_class = AttractionSerializer
    permission_classes = [IsAdminOrReadOnly]

class DestinationAttractionListView(generics.ListAPIView):
    """Lists Attractions belonging to a specific Destination"""
    serializer_class = AttractionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        destination_pk = self.kwargs['destination_pk']
        return Attraction.objects.filter(destination__pk=destination_pk)

# --- 2. Tour Package Views (Guide Logic) ---

class CreateTourView(generics.CreateAPIView):
    """
    POST /api/tours/create/
    Handles final tour submission.
    """
    queryset = TourPackage.objects.all()
    serializer_class = TourPackageSerializer
    permission_classes = [IsGuide]
    parser_classes = (MultiPartParser, FormParser)

    def perform_create(self, serializer):
        serializer.save(guide=self.request.user)

class MyToursListView(generics.ListAPIView):
    serializer_class = TourPackageSerializer
    permission_classes = [IsGuide]

    def get_queryset(self):
        return TourPackage.objects.filter(guide=self.request.user)

class ToursByDestinationListView(generics.ListAPIView):
    """
    Returns a list of Tour Packages for a specific Destination ID.
    URL: /api/destinations/<id>/tours/
    """
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        destination_id = self.kwargs['destination_id']
        return TourPackage.objects.filter(main_destination__id=destination_id)

class TourDetailView(generics.RetrieveAPIView):
    """
    Returns full details of a specific Tour Package.
    URL: /api/tours/<id>/
    """
    queryset = TourPackage.objects.all()
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.AllowAny]


# ===== NEW: Guide List View with Destination Filtering =====
class GuideListView(generics.ListAPIView):
    """
    Returns guides filtered by destination and visibility status.
    URL: /api/guides/?main_destination=1
    Only returns ACTIVE guides (is_guide_visible=True) with tours for the destination
    """
    serializer_class = GuideSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        # Filter: Only active guides who are local guides
        queryset = User.objects.filter(
            is_local_guide=True,
            is_guide_visible=True,  # Only show ACTIVE/ONLINE guides
            guide_approved=True  # Only approved guides
        ).prefetch_related('tours').distinct()
        
        # REQUIRED: Filter by destination - don't return all guides
        destination_id = self.request.query_params.get('main_destination')
        if destination_id:
            # Only return guides who have active tours for this destination
            queryset = queryset.filter(
                tours__main_destination__id=destination_id,
                tours__is_active=True  # Also check tour is active
            ).distinct()
        
        return queryset