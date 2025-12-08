from rest_framework import viewsets, permissions, generics, status #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError #type: ignore
from rest_framework.parsers import MultiPartParser, FormParser #type: ignore
from django.db.models import Q
from datetime import date

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
    parser_classes = (MultiPartParser, FormParser) 

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
        
        days = max((instance.check_out - instance.check_in).days, 1)
        print(f"DEBUG: Booking {instance.id} | Days Calculated: {days}")
        
        total_price = 0

        # 1. Add Accommodation Cost
        if instance.accommodation:
            acc_cost = instance.accommodation.price * days
            print(f"DEBUG: Adding Accommodation Cost: {acc_cost}")
            total_price += acc_cost
        
        # 2. Add Guide Cost
        if instance.guide:
            guide = instance.guide
            
            tour_package = None
            requested_tour_id = self.request.data.get('tour_package_id')
            
            print(f"DEBUG: Incoming Data Keys: {list(self.request.data.keys())}")
            print(f"DEBUG: Requested Tour ID raw: {requested_tour_id}")

            if requested_tour_id and requested_tour_id != 'null' and requested_tour_id != 'undefined':
                tour_package = TourPackage.objects.filter(id=requested_tour_id).first()
                if tour_package:
                    print(f"DEBUG: Found Tour Package: {tour_package.name} (ID: {tour_package.id})")
                else:
                    print(f"DEBUG: Tour Package ID {requested_tour_id} not found in DB.")
            
            if not tour_package and instance.destination:
                print("DEBUG: Fallback - Looking up tour by destination...")
                tour_package = TourPackage.objects.filter(
                    guide=guide, 
                    main_destination=instance.destination
                ).first()
            
            # Default fallback (Guide Global Settings)
            base_group_price = guide.price_per_day or 0
            solo_price = guide.solo_price_per_day or base_group_price
            extra_fee = guide.multiple_additional_fee_per_head or 0
            
            # Override with Tour Package settings
            if tour_package:
                base_group_price = tour_package.price_per_day or base_group_price
                solo_price = tour_package.solo_price or solo_price
                extra_fee = tour_package.additional_fee_per_head or 0
                print(f"DEBUG: Using Tour Package Prices -> Base: {base_group_price}, Solo: {solo_price}, Extra Fee: {extra_fee}")
            
            # --- FIX: Use 'solo_price' as the base rate to match frontend logic ---
            # Your frontend uses `tourCostSolo` (500) as the base for group calculations.
            # Previously we used `base_group_price` (550). Now we use `solo_price` (500).
            
            if instance.num_guests == 1:
                daily_rate = solo_price 
                print(f"DEBUG: 1 Guest -> Using Solo/Base Price: {daily_rate}")
            else:
                extra_pax = max(0, instance.num_guests - 1)
                daily_rate = solo_price + (extra_pax * extra_fee) # Changed base_group_price to solo_price
                print(f"DEBUG: {instance.num_guests} Guests -> {solo_price} + ({extra_pax} * {extra_fee}) = {daily_rate}")
            
            guide_total = daily_rate * days
            total_price += guide_total

        # 3. Add Agency Cost
        if instance.agency:
            total_price += 1000 * days

        print(f"DEBUG: Final Total Price: {total_price}")
        return total_price


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