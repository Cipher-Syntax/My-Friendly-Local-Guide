from rest_framework import viewsets, permissions, status, generics #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.parsers import MultiPartParser, FormParser #type: ignore
from rest_framework.decorators import api_view #type: ignore
from django_filters.rest_framework import DjangoFilterBackend #type: ignore
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from datetime import date

from .models import Destination, Attraction, TourPackage, TourStop
from .serializers import (
    DestinationSerializer, 
    DestinationListSerializer, 
    AttractionSerializer,
    TourPackageSerializer,
    GuideSerializer
)
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser # Add this at the top of your file if not there

User = get_user_model()

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff

# NEW: Permission for both Guides and Agencies
class IsGuideOrAgency(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        is_guide = getattr(request.user, 'is_local_guide', False)
        is_agency = hasattr(request.user, 'agency_profile')
        return is_guide or is_agency


@api_view(['GET'])
def get_category_choices(request):
    categories = [choice[0] for choice in Destination.CATEGORY_CHOICES]
    return Response(categories)

class DestinationViewSet(viewsets.ModelViewSet):
    queryset = Destination.objects.all().prefetch_related('images', 'attractions')
    permission_classes = [IsAdminOrReadOnly]

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_featured', 'category']

    def get_serializer_class(self):
        if self.action == 'list':
            return DestinationListSerializer
        return DestinationSerializer

class AttractionViewSet(viewsets.ModelViewSet):
    queryset = Attraction.objects.all()
    serializer_class = AttractionSerializer
    permission_classes = [IsAdminOrReadOnly]

class DestinationAttractionListView(generics.ListAPIView):
    serializer_class = AttractionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        destination_pk = self.kwargs['destination_pk']
        return Attraction.objects.filter(destination__pk=destination_pk)


class CreateTourView(generics.CreateAPIView):
    queryset = TourPackage.objects.all()
    serializer_class = TourPackageSerializer
    permission_classes = [IsGuideOrAgency] # CHANGED
    parser_classes = (MultiPartParser, FormParser)

    def perform_create(self, serializer):
        # SMART LOGIC: Assign to agency if they are an agency, otherwise assign to guide
        user = self.request.user
        if hasattr(user, 'agency_profile'):
            serializer.save(agency=user.agency_profile)
        else:
            serializer.save(guide=user)

class MyToursListView(generics.ListAPIView):
    serializer_class = TourPackageSerializer
    permission_classes = [IsGuideOrAgency] # CHANGED

    def get_queryset(self):
        # SMART LOGIC: Fetch tours based on user type
        user = self.request.user
        if hasattr(user, 'agency_profile'):
            return TourPackage.objects.filter(agency=user.agency_profile)
        return TourPackage.objects.filter(guide=user)

class ToursByDestinationListView(generics.ListAPIView):
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        destination_id = self.kwargs['destination_id']
        return TourPackage.objects.filter(main_destination__id=destination_id, is_active=True)

class GuideToursListView(generics.ListAPIView):
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        guide_id = self.kwargs['guide_id']
        return TourPackage.objects.filter(guide__id=guide_id, is_active=True)

class GuideDestinationsListView(generics.ListAPIView):
    serializer_class = DestinationListSerializer 
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        guide_id = self.kwargs['guide_id']
        return Destination.objects.filter(
            tour_packages__guide__id=guide_id,
            tour_packages__is_active=True
        ).distinct()

class TourDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TourPackage.objects.all()
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser) 

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        
        # Verify ownership before allowing edit
        if hasattr(user, 'agency_profile') and instance.agency == user.agency_profile:
            serializer.save()
        elif instance.guide == user:
            serializer.save()
        else:
            raise PermissionDenied("You do not have permission to edit this tour.")

    def perform_destroy(self, instance):
        user = self.request.user
        
        # Verify ownership before allowing delete
        if hasattr(user, 'agency_profile') and instance.agency == user.agency_profile:
            instance.delete()
        elif instance.guide == user:
            instance.delete()
        else:
            raise PermissionDenied("You do not have permission to delete this tour.")

class GuideListView(generics.ListAPIView):
    serializer_class = GuideSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = User.objects.filter(
            is_local_guide=True,
            is_guide_visible=True,
            guide_approved=True
        ).annotate(
            active_bookings_count=Count(
                'guide_tours_booked',
                filter=Q(
                    guide_tours_booked__status='Confirmed',
                    guide_tours_booked__check_out__gte=date.today(),
                ),
                distinct=True,
            )
        ).prefetch_related('tours').distinct()
        
        destination_id = self.request.query_params.get('main_destination')
        if destination_id:
            queryset = queryset.filter(
                tours__main_destination__id=destination_id,
                tours__is_active=True
            ).distinct()
        
        return queryset