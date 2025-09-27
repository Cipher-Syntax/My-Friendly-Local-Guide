from django.shortcuts import render
from rest_framework import viewsets, permissions #type: ignore
from .models import Personalization
from .serializers import PersonalizationSerializer

# Create your views here.
class PersonalizationViewSet(viewsets.ModelViewSet):
    queryset = Personalization.objects.all().order_by('-created_at')
    serializer_class = PersonalizationSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
