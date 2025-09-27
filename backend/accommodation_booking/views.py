from rest_framework import viewsets, permissions #type: ignore
from .models import Accommodation, Booking
from .serializers import AccommodationSerializer, BookingSerializer
from rest_framework.exceptions import PermissionDenied #type: ignore

class AccommodationViewSet(viewsets.ModelViewSet):
    queryset = Accommodation.objects.all()
    serializer_class = AccommodationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        user = self.request.user
        # only approved guides can create accommodations
        if not (user.is_authenticated and user.is_local_guide and user.guide_approved):
            raise PermissionDenied("Only approved local guides can create accommodations.")
        serializer.save(host=user)

class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all().order_by('-created_at')
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # set tourist to current user (must be authenticated)
        user = self.request.user
        serializer.save(tourist=user)
