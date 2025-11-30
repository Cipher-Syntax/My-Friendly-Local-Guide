from rest_framework import viewsets, permissions, generics, status #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError #type: ignore
from rest_framework.parsers import MultiPartParser, FormParser #type: ignore
from django.db.models import Q
from datetime import date

from .models import Accommodation, Booking
from .serializers import AccommodationSerializer, BookingSerializer
from system_management_module.models import SystemAlert


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


class AccommodationViewSet(viewsets.ModelViewSet):
    serializer_class = AccommodationSerializer
    permission_classes = [IsHostOrReadOnly]
    parser_classes = (MultiPartParser, FormParser) 

    def get_queryset(self):
        qs = Accommodation.objects.all().select_related('host')
        if not self.request.user.is_staff:
            if self.action in ['list', 'retrieve']:
                 qs = qs.filter(host=self.request.user)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(host=user, is_approved=True)

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.host != self.request.user:
            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()


class AccommodationDropdownListView(generics.ListAPIView):
    serializer_class = AccommodationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Accommodation.objects.filter(host=self.request.user).order_by('title')



class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)

    def get_queryset(self):
        user = self.request.user
        qs = Booking.objects.select_related('tourist', 'accommodation', 'guide', 'agency')
        
        view_as = self.request.query_params.get('view_as')

        if view_as == 'guide':
            return qs.filter(
                Q(accommodation__host=user) |
                Q(guide=user) |
                Q(agency=user) |
                Q(assigned_guides=user) 
            ).distinct().order_by('-created_at')
            
        elif view_as == 'tourist':
             return qs.filter(tourist=user).order_by('-created_at')

        return qs.filter(
            Q(tourist=user) |
            Q(accommodation__host=user) |
            Q(guide=user) |
            Q(agency=user) |
            Q(assigned_guides=user)
        ).distinct().order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        
        uploaded_id_image = self.request.data.get('tourist_valid_id_image')
        if uploaded_id_image and not user.valid_id_image:
            user.valid_id_image = uploaded_id_image
            user.save() 

        instance = serializer.save(tourist=user, status='Pending')
        instance.total_price = self.calculate_booking_price(instance)
        instance.save()
        
        self.validate_booking_target(instance)
        self.create_booking_alert(instance)

    def create_booking_alert(self, booking):
        try:
            recipient = None
            if booking.guide:
                recipient = booking.guide
            elif booking.agency:
                recipient = booking.agency
            elif booking.accommodation:
                recipient = booking.accommodation.host

            if recipient:
                tourist_name = f"{booking.tourist.first_name} {booking.tourist.last_name}".strip() or booking.tourist.username
                
                SystemAlert.objects.create(
                    recipient=recipient,
                    target_type='Guide',
                    title="New Booking Request",
                    message=f"You have a new booking request from {tourist_name} for {booking.check_in}.",
                    related_object_id=booking.id,
                    related_model='Booking',
                    is_read=False
                )
        except Exception as e:
            print(f"Error creating booking alert: {e}")

    def validate_booking_target(self, instance):
        target = None
        if instance.guide:
            if instance.guide.guide_tier == 'free' and instance.guide.booking_count >= 1:
                raise ValidationError("This guide is not accepting new bookings. Please upgrade their plan.")
            target = instance.guide
            if not target or not (target.is_local_guide and target.guide_approved):
                raise ValidationError("Target is not an approved guide.")
        
        elif instance.accommodation:
            target = instance.accommodation.host
            if not target or not (target.is_local_guide and target.guide_approved):
                raise ValidationError("Target is not an approved guide/host.")

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
            return 1000 * days
        return 0



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
            booking.agency == user or
            booking.assigned_guides.filter(id=user.id).exists()
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

        if new_status == 'Accepted':
            if instance.guide:
                instance.guide.booking_count += 1
                instance.guide.save()

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

        agency_guide_ids = request.data.get('agency_guide_ids', [])
        
        booking.assigned_agency_guides.clear()
        for guide_id in agency_guide_ids:
            booking.assigned_agency_guides.add(guide_id)

        return Response(self.get_serializer(booking).data)