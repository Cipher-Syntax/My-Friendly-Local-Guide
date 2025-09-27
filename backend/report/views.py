from django.shortcuts import render
from rest_framework import viewsets, permissions #type: ignore
from .models import Report
from .serializers import ReportSerializer

# Create your views here.
class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all().order_by('-timestamp')
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
