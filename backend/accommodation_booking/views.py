from django.shortcuts import render
from rest_framework import viewsets, permissions #type: ignore
from .models import Accommodation, Booking
from .serializers import AccommodationSerializer, BookingSerializer

# Create your views here.
class AccommodationViewSet(viewsets.ModelViewSet):
    queryset = Accommodation.objects.all()
    serializer_class = AccommodationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all().order_by('-created_at')
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
