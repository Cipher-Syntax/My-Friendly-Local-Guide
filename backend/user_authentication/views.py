from django.shortcuts import render
from rest_framework import viewsets, permissions #type: ignore
from .models import User
from .serializers import UserSerializer

# Create your views here.
class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]
    queryset = User.objects.all()