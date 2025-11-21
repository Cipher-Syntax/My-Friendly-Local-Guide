from rest_framework import viewsets, permissions, generics, status #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError #type: ignore
from django.db.models import Q

from .models import Accommodation, Booking
from .serializers import AccommodationSerializer, BookingSerializer
from datetime import date


# -----------------------
#   PERMISSIONS
# -----------------------

class IsHostOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return (
            request.user.is_authenticated and
            request.user.is_local_guide and
            request.user.guide_approved
        )

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.host == request.user



# -----------------------
#   ACCOMMODATION VIEWSET
# -----------------------

class AccommodationViewSet(viewsets.ModelViewSet):
    serializer_class = AccommodationSerializer
    permission_classes = [IsHostOrReadOnly]

    def get_queryset(self):
        qs = Accommodation.objects.all().select_related('host')
        if not self.request.user.is_staff:
            qs = qs.filter(is_approved=True)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(host=user, is_approved=False)

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.host != self.request.user:
            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()



# -----------------------
#   BOOKING VIEWSET
# -----------------------

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    # def get_queryset(self):
    #     user = self.request.user
    #     return Booking.objects.filter(
    #         Q(tourist=user) |
    #         Q(accommodation__host=user) |
    #         Q(guide=user) |
    #         Q(agency=user)
    #     ).select_related('tourist', 'accommodation', 'guide', 'agency').order_by('-created_at')
    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(
            Q(tourist=user) |
            Q(accommodation__host=user) |
            Q(guide=user) |
            Q(agency=user)
        ).select_related('tourist', 'accommodation', 'guide', 'agency').order_by('-created_at')


    def perform_create(self, serializer):
        user = self.request.user
        instance = serializer.save(tourist=user, status='Pending')

        instance.total_price = self.calculate_booking_price(instance)
        instance.save()

        target = None
        if instance.accommodation:
            target = instance.accommodation.host
            if not target or not (target.is_local_guide and target.guide_approved):
                raise ValidationError("Target is not an approved guide/host.")
        elif instance.guide:
            target = instance.guide
            if not target or not (target.is_local_guide and target.guide_approved):
                raise ValidationError("Target is not an approved guide.")
        elif instance.agency:
            target = instance.agency
            if not target or not target.is_staff:
                raise ValidationError("Target is not an agency.")

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user

        if user == instance.tourist and 'status' in self.request.data:
            if self.request.data['status'] == 'Cancelled' and instance.status in ['Pending', 'Accepted']:
                instance.status = 'Cancelled'
                instance.save()
                return Response(serializer.data)

            raise PermissionDenied("You can only cancel your own booking.")

        raise PermissionDenied("Use the status endpoint for host/agency updates.")

    def calculate_booking_price(self, instance):
        if not instance.check_in or not instance.check_out:
            return 0

        days = (instance.check_out - instance.check_in).days + 1

        if instance.accommodation:
            return instance.accommodation.price * days

        if instance.guide:
            return instance.guide.price_per_day * days
        
        if instance.agency:
            # For now, let's assume a fixed price for agency bookings
            return 1000 * days

        return 0



# -----------------------
#   BOOKING STATUS UPDATE
# -----------------------

class BookingStatusUpdateView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        booking = super().get_object()
        user = self.request.user

        is_owner = (
            booking.guide == user or
            (booking.accommodation and booking.accommodation.host == user) or
            booking.agency == user
        )

        if not is_owner:
            raise PermissionDenied("You cannot manage this booking.")

        return booking

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')

        if not new_status:
            raise ValidationError({"status": "Status is required."})

        valid = {
            'Pending': ['Accepted', 'Declined'],
            'Accepted': ['Paid', 'Declined'],
            'Paid': ['Completed'],
        }

        if new_status not in valid.get(instance.status, []):
            return Response(
                {"status": f"Cannot change from '{instance.status}' to '{new_status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = new_status
        instance.save()
        return Response(self.get_serializer(instance).data)

class AssignGuidesView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        user = self.request.user

        if booking.agency != user:
            raise PermissionDenied("You are not the agency for this booking.")

        guide_ids = request.data.get('guide_ids', [])
        
        booking.assigned_guides.clear()
        for guide_id in guide_ids:
            booking.assigned_guides.add(guide_id)

        return Response(self.get_serializer(booking).data)
