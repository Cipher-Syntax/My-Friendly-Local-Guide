from rest_framework import viewsets, permissions, generics, status #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError #type: ignore
from rest_framework.parsers import MultiPartParser, FormParser #type: ignore
from django.db.models import Q
from datetime import date

from .models import Accommodation, Booking
from .serializers import AccommodationSerializer, BookingSerializer
from system_management_module.models import SystemAlert

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
#   ACCOMMODATION VIEWS
# -----------------------

class AccommodationViewSet(viewsets.ModelViewSet):
    serializer_class = AccommodationSerializer
    permission_classes = [IsHostOrReadOnly]
    # MultiPartParser is needed to handle image uploads + JSON fields together
    parser_classes = (MultiPartParser, FormParser) 

    def get_queryset(self):
        qs = Accommodation.objects.all().select_related('host')
        if not self.request.user.is_staff:
            # For the general API, we might want to see public approved ones
            # But if the guide is managing them, they need to see their own unapproved ones
            if self.action in ['list', 'retrieve']:
                 # Logic: Show mine (approved or not) OR show others (only approved)
                 # For simplicity here: Hosts see only their own in this dashboard view
                 qs = qs.filter(host=self.request.user)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        # 🔥 UPDATE: Set is_approved=True to skip admin approval
        serializer.save(host=user, is_approved=True)

    def perform_update(self, serializer):
        instance = serializer.instance
        if instance.host != self.request.user:
            raise PermissionDenied("You cannot edit this listing.")
        serializer.save()


class AccommodationDropdownListView(generics.ListAPIView):
    """
    Guide-specific list of THEIR OWN accommodations.
    Used by AddTour.js.
    """
    serializer_class = AccommodationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Return only the accommodations owned by the currently authenticated guide.
        return Accommodation.objects.filter(host=self.request.user).order_by('title')


# -----------------------
#   BOOKING VIEWS
# -----------------------

class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    # 🔥 ADDED: MultiPartParser to handle Image Uploads in Bookings
    parser_classes = (MultiPartParser, FormParser)

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
        
        # --- 🔥 KYC LOGIC START 🔥 ---
        # 1. Check if an image is being uploaded with this booking
        uploaded_id_image = self.request.data.get('tourist_valid_id_image')

        # 2. If the User profile doesn't have a Valid ID yet, save this one permanently
        # (Assumes your User model has 'valid_id_image' field)
        if uploaded_id_image and not user.valid_id_image:
            user.valid_id_image = uploaded_id_image
            user.save() 
            # This ensures next time they book, user.valid_id_image is already there.
        # --- 🔥 KYC LOGIC END 🔥 ---

        # 3. Create the booking
        instance = serializer.save(tourist=user, status='Pending')

        # 4. Calculate Price
        instance.total_price = self.calculate_booking_price(instance)
        instance.save()

        # 5. Validate Targets
        self.validate_booking_target(instance)

        # 6. --- 🔥 NEW NOTIFICATION LOGIC START 🔥 ---
        # This calls the helper function below to create the SystemAlert
        self.create_booking_alert(instance)
        # --- 🔥 NEW NOTIFICATION LOGIC END 🔥 ---

    def create_booking_alert(self, booking):
        """
        Creates a SystemAlert for the Guide, Agency, or Host.
        """
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
                    target_type='Guide', # Indicates this is for a service provider
                    title="New Booking Request", # MUST MATCH the frontend key exactly
                    message=f"You have a new booking request from {tourist_name} for {booking.check_in}.",
                    related_object_id=booking.id,
                    related_model='Booking',
                    is_read=False
                )
                print(f"Alert created for {recipient.username}")
        except Exception as e:
            print(f"Error creating booking alert: {e}")

    def validate_booking_target(self, instance):
        """Helper method to validate booking targets"""
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

        # --- UPDATE: SEND ALERT TO TOURIST WHEN GUIDE ACCEPTS ---
        if new_status == 'Accepted':
            if instance.guide:
                instance.guide.booking_count += 1
                instance.guide.save()
            
            # Create Alert for Tourist
            SystemAlert.objects.create(
                recipient=instance.tourist,
                target_type='Tourist',
                title="Booking Accepted!",
                message=f"Your booking with {instance.guide.username if instance.guide else 'your host'} has been accepted!",
                related_object_id=instance.id,
                related_model='Booking',
                is_read=False
            )

        elif new_status == 'Declined':
             # Create Alert for Tourist
            SystemAlert.objects.create(
                recipient=instance.tourist,
                target_type='Tourist',
                title="Booking Declined",
                message=f"Your booking request was declined.",
                related_object_id=instance.id,
                related_model='Booking',
                is_read=False
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