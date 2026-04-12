from rest_framework import viewsets, permissions, status, generics #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.parsers import MultiPartParser, FormParser #type: ignore
from django_filters.rest_framework import DjangoFilterBackend #type: ignore
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from datetime import date

from .models import Destination, DestinationCategory, Attraction, TourPackage, TourStop
from .serializers import (
    DestinationSerializer, 
    DestinationListSerializer, 
    AttractionSerializer,
    TourPackageSerializer,
    GuideSerializer
)
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser # Add this at the top of your file if not there
from backend.pagination import OptionalPageNumberPagination

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


class CategoryChoicesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _build_category_choices(self):
        defaults = [choice[0] for choice in Destination.CATEGORY_CHOICES]
        custom = list(DestinationCategory.objects.values_list('name', flat=True))
        used = list(Destination.objects.order_by().values_list('category', flat=True).distinct())

        categories = []
        seen = set()

        for source in (defaults, custom, used):
            for raw in source:
                category = str(raw or '').strip()
                if not category:
                    continue

                key = category.lower()
                if key in seen:
                    continue

                seen.add(key)
                categories.append(category)

        return categories

    def get(self, request):
        return Response(self._build_category_choices())

    def post(self, request):
        if not request.user.is_staff:
            return Response({'detail': 'Only admins can add categories.'}, status=status.HTTP_403_FORBIDDEN)

        raw_name = request.data.get('name') or request.data.get('category') or ''
        name = str(raw_name).strip()

        if not name:
            return Response({'detail': 'Category name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(name) > 50:
            return Response({'detail': 'Category name must be 50 characters or less.'}, status=status.HTTP_400_BAD_REQUEST)

        existing_custom = DestinationCategory.objects.filter(name__iexact=name).first()
        if existing_custom:
            category_name = existing_custom.name
            created = False
        else:
            existing_known = next(
                (category for category in self._build_category_choices() if category.lower() == name.lower()),
                None,
            )
            if existing_known:
                category_name = existing_known
                created = False
            else:
                created_entry = DestinationCategory.objects.create(name=name)
                category_name = created_entry.name
                created = True

        return Response(
            {
                'detail': 'Category added successfully.' if created else 'Category already exists.',
                'category': category_name,
                'categories': self._build_category_choices(),
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

class DestinationViewSet(viewsets.ModelViewSet):
    queryset = Destination.objects.all().prefetch_related('images', 'attractions')
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = OptionalPageNumberPagination

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
    pagination_class = OptionalPageNumberPagination

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