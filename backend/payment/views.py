from django.shortcuts import render
from rest_framework import viewsets, permissions #type: ignore
from .models import Payment
from .serializers import PaymentSerializer

# Create your views here.
class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-timestamp')
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
