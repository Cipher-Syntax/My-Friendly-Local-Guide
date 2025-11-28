from rest_framework import viewsets, permissions, generics #type: ignore
from django.db.models import Avg, Q
from .models import Review, DestinationReview
from .serializers import ReviewSerializer, DestinationReviewSerializer
from user_authentication.models import User 
# Import Destination model assuming it's available in the Django project scope
from destinations_and_attractions.models import Destination
from system_management_module.models import SystemAlert


class ReviewViewSet(viewsets.ModelViewSet):
    """
    CRUD for User/Guide Reviews. Handles automatic rating updates for the Guide.
    """
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        # Authenticated users see reviews they gave or reviews they received.
        # Staff/Admins see all reviews.
        if self.request.user.is_staff:
            return Review.objects.all().order_by('-timestamp')
        
        return Review.objects.filter(
            Q(reviewer=self.request.user) | Q(reviewed_user=self.request.user)
        ).order_by('-timestamp')

    def perform_create(self, serializer):
        # 1. Save the review, setting the reviewer automatically
        review = serializer.save(reviewer=self.request.user)
        
        # 2. Update the reviewed user's average rating
        self._update_guide_rating(review.reviewed_user)

        # 3. Create a notification for the guide
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
        # Update the review
        super().perform_update(serializer)
        # Recalculate rating after update
        self._update_guide_rating(serializer.instance.reviewed_user)

    def perform_destroy(self, instance):
        reviewed_user = instance.reviewed_user
        super().perform_destroy(instance)
        # Recalculate rating after deletion
        self._update_guide_rating(reviewed_user)
        
    def _update_guide_rating(self, user_instance):
        """Helper to calculate and update the guide_rating field on the User model."""
        avg_rating = Review.objects.filter(reviewed_user=user_instance).aggregate(Avg('rating'))['rating__avg'] or 0.0
        
        user_instance.guide_rating = round(avg_rating, 1)
        user_instance.save(update_fields=['guide_rating'])


class DestinationReviewViewSet(viewsets.ModelViewSet):
    """
    CRUD for Destination Reviews. Handles automatic rating updates for the Destination.
    """
    serializer_class = DestinationReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    queryset = DestinationReview.objects.all().order_by('-timestamp')

    def perform_create(self, serializer):
        destination = serializer.validated_data['destination']
        
        # 1. Save the review, setting the reviewer automatically
        review = serializer.save(reviewer=self.request.user, destination=destination)
        
        # 2. Update the destination's average rating
        self._update_destination_rating(destination)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._update_destination_rating(serializer.instance.destination)

    def perform_destroy(self, instance):
        destination = instance.destination
        super().perform_destroy(instance)
        self._update_destination_rating(destination)
        
    def _update_destination_rating(self, destination_instance):
        """Helper to calculate and update the average_rating field on the Destination model."""
        avg_rating = DestinationReview.objects.filter(destination=destination_instance).aggregate(Avg('rating'))['rating__avg'] or 0.0
        
        destination_instance.average_rating = round(avg_rating, 1)
        destination_instance.save(update_fields=['average_rating'])