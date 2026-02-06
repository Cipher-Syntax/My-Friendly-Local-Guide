from rest_framework import viewsets, permissions, generics, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser 
from django.db.models import Q
from datetime import date, timedelta

from .models import Accommodation, Booking
from .serializers import AccommodationSerializer, BookingSerializer
from system_management_module.models import SystemAlert
from destinations_and_attractions.models import TourPackage  

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
    parser_classes = (MultiPartParser, FormParser, JSONParser) 

    def get_queryset(self):
        qs = Accommodation.objects.all().select_related('host')
        target_host_id = self.request.query_params.get('host_id')
        if target_host_id:
            return qs.filter(host_id=target_host_id, is_approved=True).order_by('-created_at')

        if self.request.user.is_staff:
            return qs.order_by('-created_at')

        if self.action in ['list', 'retrieve', 'update', 'destroy']:
             return qs.filter(host=self.request.user).order_by('-created_at')
        
        return qs.filter(host=self.request.user).order_by('-created_at')

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
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get_queryset(self):
        user = self.request.user
        qs = Booking.objects.select_related('tourist', 'accommodation', 'guide', 'agency')
        
        if user.is_staff or user.is_superuser:
            return qs.order_by('-created_at')

        # --- FIX: Handle view_as parameter to filter specifically for Guide Dashboard ---
        view_as = self.request.query_params.get('view_as')

        if view_as == 'guide':
            # Only return bookings where the user is the Service Provider (Guide, Host, or Agency)
            return qs.filter(
                Q(accommodation__host=user) |
                Q(guide=user) |
                Q(agency=user) |
                Q(assigned_guides=user)
            ).distinct().order_by('-created_at')
        
        # Default behavior: Returns bookings where user is EITHER tourist OR provider
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

        instance = serializer.save(tourist=user, status='Pending_Payment')
        
        total_price = self.calculate_booking_price(instance)
        down_payment = total_price * 0.30 
        balance_due = total_price - down_payment
        
        instance.total_price = total_price
        instance.down_payment = down_payment
        instance.balance_due = balance_due
        
        instance.save()
        self.validate_booking_target(instance)

    @action(detail=False, methods=['get'])
    def guide_blocked_dates(self, request):
        guide_id = request.query_params.get('guide_id')
        if not guide_id:
            return Response({"error": "guide_id is required"}, status=400)
            
        bookings = Booking.objects.filter(
            guide_id=guide_id, 
            status='Confirmed'
        ).values('check_in', 'check_out')
        
        blocked_dates = []
        for b in bookings:
            start = b['check_in']
            end = b['check_out']
            curr = start
            # FIX: Use <= to include the check-out date as blocked (since guides work that day)
            while curr <= end: 
                blocked_dates.append(curr.isoformat())
                curr += timedelta(days=1)
                
        return Response(blocked_dates)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        booking = self.get_object()
        user = request.user

        is_provider = (
            booking.guide == user or 
            booking.agency == user or 
            (booking.accommodation and booking.accommodation.host == user)
        )
        
        if not is_provider:
            return Response({"error": "Only the service provider can mark this as paid."}, status=403)

        booking.balance_due = 0
        booking.status = 'Completed' 
        booking.save()

        SystemAlert.objects.create(
            target_type='Tourist',
            recipient=booking.tourist,
            title="Trip Completed / Paid",
            message=f"Your trip to {booking.destination or 'your destination'} has been marked as fully paid and completed. Thank you!",
            related_object_id=booking.id,
            related_model='Booking',
            is_read=False
        )

        return Response(self.get_serializer(booking).data)

    def create_booking_alert(self, booking):
        if booking.status != 'Confirmed':
            return

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
                    title="New Confirmed Booking", 
                    message=f"New trip confirmed! {tourist_name} for {booking.check_in}. Check your schedule.",
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
                raise ValidationError("This guide is not accepting new bookings (Limit Reached).")
            target = instance.guide
            if not target or not (target.is_local_guide and target.guide_approved):
                raise ValidationError("Target is not an approved guide.")
        
        if instance.accommodation:
            target = instance.accommodation.host
            if not target or not (target.is_local_guide and target.guide_approved):
                raise ValidationError("Target is not an approved guide/host.")
        if instance.agency:
            target = instance.agency
            if not target or not target.is_staff:
                raise ValidationError("Target is not an agency.")

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user
        
        if user.is_staff or user.is_superuser:
            serializer.save()
            return

        if user == instance.tourist and 'status' in self.request.data:
            if self.request.data['status'] == 'Cancelled':
                instance.status = 'Cancelled'
                instance.save()
                return 
            raise PermissionDenied("You can only cancel your own booking.")
            
        raise PermissionDenied("Use the status endpoint for updates.")

    def calculate_booking_price(self, instance):
        if not instance.check_in or not instance.check_out:
            return 0
        days = max((instance.check_out - instance.check_in).days, 1)
        total_price = 0

        if instance.accommodation:
            acc_cost = instance.accommodation.price * days
            total_price += acc_cost
        
        if instance.guide:
            guide = instance.guide
            tour_package = None
            requested_tour_id = self.request.data.get('tour_package_id')
            
            if requested_tour_id and requested_tour_id != 'null':
                tour_package = TourPackage.objects.filter(id=requested_tour_id).first()
            
            if not tour_package and instance.destination:
                tour_package = TourPackage.objects.filter(guide=guide, main_destination=instance.destination).first()
            
            base_group_price = guide.price_per_day or 0
            solo_price = guide.solo_price_per_day or base_group_price
            extra_fee = guide.multiple_additional_fee_per_head or 0
            
            if tour_package:
                base_group_price = tour_package.price_per_day or base_group_price
                solo_price = tour_package.solo_price or solo_price
                extra_fee = tour_package.additional_fee_per_head or 0
            
            if instance.num_guests == 1:
                daily_rate = solo_price 
            else:
                extra_pax = max(0, instance.num_guests - 1)
                daily_rate = solo_price + (extra_pax * extra_fee) 
            
            guide_total = daily_rate * days
            total_price += guide_total

        if instance.agency:
            total_price += 1000 * days

        return float(total_price)


class BookingStatusUpdateView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def get_object(self):
        booking = super().get_object()
        user = self.request.user
        is_participant = (
            booking.tourist == user or 
            booking.guide == user or
            (booking.accommodation and booking.accommodation.host == user) or
            booking.agency == user
        )
        if not is_participant:
            raise PermissionDenied("You cannot manage this booking.")
        return booking

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            raise ValidationError({"status": "Status is required."})

        if new_status == 'Confirmed':
            try:
                instance.clean()
            except ValidationError as e:
                return Response({"error": "Dates are no longer available."}, status=400)

            instance.status = 'Confirmed'
            if instance.guide:
                instance.guide.booking_count += 1
                instance.guide.save()
            instance.save()
            BookingViewSet().create_booking_alert(instance)
            return Response(self.get_serializer(instance).data)

        if new_status == 'Cancelled':
            instance.status = 'Cancelled'
            instance.save()
            return Response(self.get_serializer(instance).data)
            
        if new_status == 'Accepted':
             if instance.guide:
                instance.guide.booking_count += 1
                instance.guide.save()
             
             SystemAlert.objects.create(
                target_type='Tourist',
                recipient=instance.tourist,
                title="Booking Accepted!",
                message=f"Your booking for {instance.destination or 'your trip'} has been accepted.",
                related_object_id=instance.id,
                related_model='Booking',
                is_read=False
            )
             instance.status = 'Accepted'
             instance.save()
             return Response(self.get_serializer(instance).data)

        if new_status == 'Declined':
             SystemAlert.objects.create(
                target_type='Tourist',
                recipient=instance.tourist,
                title="Booking Declined",
                message=f"Your booking request was declined.",
                related_object_id=instance.id,
                related_model='Booking',
                is_read=False
            )
             instance.status = 'Declined'
             instance.save()
             return Response(self.get_serializer(instance).data)

        return Response(
            {"status": f"Invalid status transition to '{new_status}'."},
            status=status.HTTP_400_BAD_REQUEST
        )


class AssignGuidesView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

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