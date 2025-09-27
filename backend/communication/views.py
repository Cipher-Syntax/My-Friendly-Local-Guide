from django.shortcuts import render
from rest_framework import viewsets, permissions #type: ignore
from .models import Message
from .serializers import MessageSerializer

# Create your views here.
class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]