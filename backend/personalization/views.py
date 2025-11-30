from rest_framework import viewsets, permissions #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import NotFound #type: ignore
from .models import Personalization
from .serializers import PersonalizationSerializer
from django.shortcuts import get_object_or_404

class PersonalizationViewSet(viewsets.ModelViewSet):
    queryset = Personalization.objects.all() 
    serializer_class = PersonalizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Personalization.objects.filter(user=self.request.user)

    def get_object(self):
        user = self.request.user
        try:
            return Personalization.objects.get(user=user)
        except Personalization.DoesNotExist:
            if self.action in ['retrieve', 'update', 'partial_update']:
                return Personalization.objects.create(user=user)
            raise NotFound("Profile not found.")

    def perform_create(self, serializer):
        if Personalization.objects.filter(user=self.request.user).exists():
            raise NotFound("Profile already exists. Use PUT/PATCH to update.")
        
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        instance.delete()