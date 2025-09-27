from django.shortcuts import render
from rest_framework import viewsets, permissions #type: ignore
from .models import Review, DestinationReview
from .serializers import ReviewSerializer, DestinationReviewSerializer

# Create your views here.
class ReviewViewSet(viewsets.ModelViewSet):
    queryset = Review.objects.all().order_by('-timestamp')
    serializer_class = ReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
class DestinationReviewViewSet(viewsets.ModelViewSet):
    queryset = DestinationReview.objects.all().order_by('-timestamp')
    serializer_class = DestinationReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
