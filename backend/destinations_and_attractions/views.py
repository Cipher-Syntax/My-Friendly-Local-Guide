# from rest_framework import viewsets, permissions, generics, status #type: ignore
# from rest_framework.response import Response #type: ignore
# from .models import Destination, Attraction
# from .serializers import DestinationSerializer, DestinationListSerializer, AttractionSerializer

# # --- Custom Permission (Assuming you'll place this in a permissions.py file later) ---
# class IsGuideOrReadOnly(permissions.BasePermission):
#     """Custom permission to only allow approved local guides to create/edit."""
#     def has_permission(self, request, view):
#         # Read permissions are allowed to any request
#         if request.method in permissions.SAFE_METHODS:
#             return True
#         # Write permissions are only allowed to approved guides
#         return request.user.is_authenticated and request.user.is_local_guide and request.user.guide_approved
# # --------------------------------------------------------------------------------------


# class DestinationViewSet(viewsets.ModelViewSet):
#     """
#     CRUD for Destinations.
#     List/Retrieve for everyone. Create/Update/Delete only for approved guides.
#     """
#     # Prefetch related data for efficiency on detail views
#     queryset = Destination.objects.all().prefetch_related('images', 'attractions', 'creator') 
    
#     # Use the custom permission
#     permission_classes = [IsGuideOrReadOnly] 

#     def get_serializer_class(self):
#         # Switch to the lean serializer for listing destinations
#         if self.action == 'list':
#             return DestinationListSerializer
#         # Use the detailed serializer for detail, create, update
#         return DestinationSerializer
        
#     def perform_create(self, serializer):
#         # Automatically assign the creator field to the currently authenticated guide
#         serializer.save(creator=self.request.user)
        
#     # We don't need to explicitly handle retrieval or updating of nested images/attractions 
#     # here, as those are read-only fields handled by the serializer.
#     # CRUD for images/attractions should be done via separate dedicated views.


# class AttractionViewSet(viewsets.ModelViewSet):
#     """
#     CRUD for Attractions.
#     List/Retrieve for everyone. Create/Update/Delete only for approved guides.
#     """
#     queryset = Attraction.objects.all()
#     serializer_class = AttractionSerializer
#     permission_classes = [IsGuideOrReadOnly]
    
#     # Note: When creating/updating an Attraction, the 'destination' field must be provided in the request body.


# class DestinationAttractionListView(generics.ListAPIView):
#     """
#     Lists Attractions belonging to a specific Destination.
#     Accessed via: /api/destinations/<destination_pk>/attractions/
#     """
#     serializer_class = AttractionSerializer
#     permission_classes = [permissions.AllowAny] # Allow anyone to see attractions

#     def get_queryset(self):
#         destination_pk = self.kwargs['destination_pk']
#         # Filter attractions by the destination ID provided in the URL
#         return Attraction.objects.filter(destination__pk=destination_pk)

from rest_framework import viewsets, permissions, status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import Destination, Attraction, TourPackage, TourStop
from .serializers import (
    DestinationSerializer, 
    DestinationListSerializer, 
    AttractionSerializer,
    TourPackageSerializer
)

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

class CreateTourView(APIView):
    permission_classes = [IsGuide]
    parser_classes = (MultiPartParser, FormParser)

    def post(self, request, *args, **kwargs):
        data = request.data
        user = request.user

        try:
            # 1. Create the Tour Package
            tour = TourPackage.objects.create(
                guide=user,
                main_destination_id=data.get('destination_id'),
                name=data.get('name'),
                description=data.get('description'),
                duration=data.get('duration'),
                max_group_size=data.get('max_group_size'),
                what_to_bring=data.get('what_to_bring'),
                price_per_day=data.get('price_per_day'),
                solo_price=data.get('solo_price'),
                additional_fee_per_head=data.get('additional_fee_per_head', 0)
            )

            # 2. Handle Tour Stops
            stop_names = data.getlist('stops_names') 
            stop_images = data.getlist('stops_images')

            if stop_names:
                for index, name in enumerate(stop_names):
                    image = None
                    if index < len(stop_images):
                        image = stop_images[index]
                    
                    TourStop.objects.create(
                        tour=tour,
                        name=name,
                        image=image,
                        order=index
                    )

            serializer = TourPackageSerializer(tour, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            print(f"Error creating tour: {e}")
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class MyToursListView(APIView):
    permission_classes = [IsGuide]

    def get(self, request):
        tours = TourPackage.objects.filter(guide=request.user)
        serializer = TourPackageSerializer(tours, many=True, context={'request': request})
        return Response(serializer.data)

from rest_framework import generics
from .models import TourPackage
from .serializers import TourPackageSerializer

class ToursByDestinationListView(generics.ListAPIView):
    """
    Returns a list of Tour Packages for a specific Destination ID.
    URL: /api/destinations/<id>/tours/
    """
    serializer_class = TourPackageSerializer
    permission_classes = [] # Public access

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
    permission_classes = []