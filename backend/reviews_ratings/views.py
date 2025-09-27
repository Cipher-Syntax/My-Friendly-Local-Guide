from rest_framework import viewsets, permissions #type: ignore
from .models import Review, DestinationReview
from .serializers import ReviewSerializer, DestinationReviewSerializer

class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-timestamp')
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)

class DestinationReviewViewSet(viewsets.ModelViewSet):
    queryset = DestinationReview.objects.all().order_by('-timestamp')
    serializer_class = DestinationReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(reviewer=self.request.user)
