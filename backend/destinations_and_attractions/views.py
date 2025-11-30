from rest_framework import viewsets, permissions, status, generics #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.parsers import MultiPartParser, FormParser #type: ignore
from django_filters.rest_framework import DjangoFilterBackend #type: ignore
from django.contrib.auth import get_user_model
from django.db.models import Q

from .models import Destination, Attraction, TourPackage, TourStop
from .serializers import (
    DestinationSerializer, 
    DestinationListSerializer, 
    AttractionSerializer,
    TourPackageSerializer,
    GuideSerializer
)

User = get_user_model()

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff

class IsGuide(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, 'is_local_guide', False)


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
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        destination_id = self.kwargs['destination_id']
        return TourPackage.objects.filter(main_destination__id=destination_id)

class TourDetailView(generics.RetrieveAPIView):
    queryset = TourPackage.objects.all()
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.AllowAny]


class GuideListView(generics.ListAPIView):
    serializer_class = GuideSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = User.objects.filter(
            is_local_guide=True,
            is_guide_visible=True,
            guide_approved=True
        )

        queryset = queryset.filter(
            Q(guide_tier='paid') | Q(booking_count=0)
        ).prefetch_related('tours').distinct()
        
        destination_id = self.request.query_params.get('main_destination')
        if destination_id:
            queryset = queryset.filter(
                tours__main_destination__id=destination_id,
                tours__is_active=True
            ).distinct()
        
        return queryset