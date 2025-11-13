from rest_framework import viewsets, permissions, generics, status #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError #type: ignore
from django.db.models import Q
from .models import Accommodation, Booking
from .serializers import AccommodationSerializer, BookingSerializer
from datetime import date 


# --- Custom Permission ---

class IsHostOrReadOnly(permissions.BasePermission):
    """Allows read access to all, but only the host (approved guide) can create/edit."""
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Allow CREATE only if the user is an approved guide
        return request.user.is_authenticated and request.user.is_local_guide and request.user.guide_approved

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        # Allow EDIT/DELETE only if the user is the host
        return obj.host == request.user


# --- 1. Accommodation ViewSet ---

class AccommodationViewSet(viewsets.ModelViewSet):
    """
    CRUD for Accommodation listings.
    Lists only approved items unless the user is staff.
    """
    serializer_class = AccommodationSerializer
    permission_classes = [IsHostOrReadOnly]

    def get_queryset(self):
        # Prefetch the host for efficiency
        queryset = Accommodation.objects.all().select_related('host')
        
        # Only show approved listings to the public/tourists
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_approved=True)
            
        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        # The IsHostOrReadOnly permission already checks if the user is an approved guide.
        # New listings start unapproved, ready for admin review
        serializer.save(host=user, is_approved=False)
        
    def perform_update(self, serializer):
        # Use IsHostOrReadOnly.has_object_permission to ensure only the host updates
        instance = serializer.instance
        if instance.host != self.request.user:
            raise PermissionDenied("You do not have permission to update this listing.")
        serializer.save()


# --- 2. Booking ViewSet ---

class BookingViewSet(viewsets.ModelViewSet):
    """
    Handles Booking CRUD. Tourists create; Hosts/Guides manage status.
    """
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not user.is_authenticated:
            return Booking.objects.none()

        # Query bookings where user is the tourist OR the host/guide involved
        return Booking.objects.filter(
            Q(tourist=user) | Q(accommodation__host=user) | Q(guide=user)
        ).distinct().select_related('tourist', 'accommodation', 'guide').order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        instance = serializer.save(tourist=user, status='Pending') # Set tourist and initial status
        
        # Calculate and set the total price
        instance.total_price = self.calculate_booking_price(instance)
        instance.save()
        
        # Final check: Ensure target exists and is approved (optional but safe)
        if instance.accommodation:
            target = instance.accommodation.host
        elif instance.guide:
            target = instance.guide
        
        if not target or not (target.is_local_guide and target.guide_approved):
             # Should ideally be caught by serializers, but this is a final safety net
             raise ValidationError("Booking target is not an approved guide/host.")
             
    def perform_update(self, serializer):
        # This update logic is restrictive: only allow the tourist to cancel.
        instance = serializer.instance
        user = self.request.user
        
        if user == instance.tourist and 'status' in self.request.data:
            # Allow tourist to cancel their own booking if it's Pending/Accepted
            if self.request.data['status'] == 'Cancelled' and instance.status in ['Pending', 'Accepted']:
                instance.status = 'Cancelled'
                instance.save()
                return Response(serializer.data)
            else:
                 raise PermissionDenied("Tourists can only use this endpoint to cancel their booking.")
        
        # Block all other updates via the generic PUT/PATCH methods
        raise PermissionDenied("Use the specific booking status endpoint for host actions.")
        
    def calculate_booking_price(self, instance):
        """Calculates the final total price for the booking instance (no service fee included)."""
        if not instance.check_in or not instance.check_out:
            return 0.00
            
        duration = (instance.check_out - instance.check_in).days + 1
        
        if instance.accommodation:
            base_rate = instance.accommodation.price
            return base_rate * duration
        
        elif instance.guide:
            # Assuming the guide has a 'price_per_day' field on the User model
            base_rate_per_day = instance.guide.price_per_day 
            return base_rate_per_day * duration
            
        return 0.00


# --- 3. Booking Status Management (Host/Guide Action) ---

class BookingStatusUpdateView(generics.UpdateAPIView):
    """
    Allows a Guide/Host to change the status of a booking (Accept, Decline, Paid/Complete).
    """
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    # Only authenticated users (who must be the host/guide) can use this
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        booking = super().get_object()
        user = self.request.user
        
        # Determine if the user is the host/guide of this specific booking
        is_owner = (booking.guide == user) or (booking.accommodation and booking.accommodation.host == user)
            
        if not is_owner:
            raise PermissionDenied("You do not have permission to manage this booking status.")
        
        return booking

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        
        if not new_status:
            raise ValidationError({'status': 'A new status is required for this action.'})
        
        # Status validation logic (ensures valid flow)
        valid_transitions = {
            'Pending': ['Accepted', 'Declined'],
            'Accepted': ['Paid', 'Declined'],
            'Paid': ['Completed'],
        }
        
        if new_status not in valid_transitions.get(instance.status, []):
            return Response(
                {"status": f"Invalid status change. Cannot transition from '{instance.status}' to '{new_status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Update status
        instance.status = new_status
        instance.save()
        
        # Return updated booking data
        serializer = self.get_serializer(instance)
        return Response(serializer.data, status=status.HTTP_200_OK)