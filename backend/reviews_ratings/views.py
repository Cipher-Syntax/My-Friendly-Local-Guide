from rest_framework import viewsets, permissions, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Avg, Q
from django.core.management import call_command
import os

from .models import Review, DestinationReview
from .serializers import ReviewSerializer, DestinationReviewSerializer
from user_authentication.models import User 
from destinations_and_attractions.models import Destination
from system_management_module.models import SystemAlert


class ReviewViewSet(viewsets.ModelViewSet):
 
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = Review.objects.all().order_by('-timestamp')
        user = self.request.user
        
        # --- NEW LOGIC START ---
        # Allow approved Agencies to see reviews for their bookings
        if hasattr(user, 'agency_profile') and user.agency_profile.is_approved:
            return queryset.filter(booking__agency=user)
        # --- NEW LOGIC END ---

        filter_type = self.request.query_params.get('filter')

        if filter_type == 'received':
            return queryset.filter(reviewed_user=user)
        elif filter_type == 'given':
            return queryset.filter(reviewer=user)
        
        return queryset.filter(Q(reviewer=user) | Q(reviewed_user=user))

    def perform_create(self, serializer):
        review = serializer.save(reviewer=self.request.user)
        
        self._update_guide_rating(review.reviewed_user)

        if review.reviewed_user:
            SystemAlert.objects.create(
                recipient=review.reviewed_user,
                target_type='Guide',
                title='You have a new review!',
                message=f'A tourist has left a {review.rating}-star review for you.',
                related_object_id=review.id,
                related_model='Review'
            )

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._update_guide_rating(serializer.instance.reviewed_user)

    def perform_destroy(self, instance):
        reviewed_user = instance.reviewed_user
        super().perform_destroy(instance)
        self._update_guide_rating(reviewed_user)
        
    def _update_guide_rating(self, user_instance):
        avg_rating = Review.objects.filter(reviewed_user=user_instance).aggregate(Avg('rating'))['rating__avg'] or 0.0
        
        user_instance.guide_rating = round(avg_rating, 1)
        user_instance.save(update_fields=['guide_rating'])


class DestinationReviewViewSet(viewsets.ModelViewSet):
   
    serializer_class = DestinationReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    queryset = DestinationReview.objects.all().order_by('-timestamp')

    def perform_create(self, serializer):
        destination = serializer.validated_data['destination']
        
        review = serializer.save(reviewer=self.request.user, destination=destination)
        
        self._update_destination_rating(destination)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._update_destination_rating(serializer.instance.destination)

    def perform_destroy(self, instance):
        destination = instance.destination
        super().perform_destroy(instance)
        self._update_destination_rating(destination)
        
    def _update_destination_rating(self, destination_instance):
        avg_rating = DestinationReview.objects.filter(destination=destination_instance).aggregate(Avg('rating'))['rating__avg'] or 0.0
        
        destination_instance.average_rating = round(avg_rating, 1)
        destination_instance.save(update_fields=['average_rating'])

# --- NEW CRON TRIGGER ENDPOINT ---
@api_view(['GET', 'POST'])
@permission_classes([permissions.AllowAny]) # Allow any so external service can ping it
def trigger_review_reminders(request):
    # Get a secret key from the request headers or URL parameters
    provided_key = request.GET.get('key') or request.headers.get('Authorization')
    
    # Define your secret key (you should set this in Render Environment Variables)
    # Fallback to a hardcoded string just for testing, but ideally use os.environ
    expected_key = os.environ.get('CRON_SECRET_KEY')

    if provided_key != expected_key:
        return Response({"error": "Unauthorized. Invalid cron key."}, status=403)

    try:
        # This executes the logic from your send_review_reminders.py file automatically!
        call_command('send_review_reminders')
        return Response({"status": "success", "message": "Review reminders executed successfully."})
    except Exception as e:
        return Response({"status": "error", "message": str(e)}, status=500)