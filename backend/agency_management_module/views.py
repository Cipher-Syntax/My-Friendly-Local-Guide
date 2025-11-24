# app/views.py

from rest_framework import generics #type: ignore
from rest_framework.permissions import IsAdminUser, AllowAny  #type: ignore
from .models import Agency, TouristGuide
from .serializers import (
    AgencySerializer,
    AgencyApprovalSerializer,
    TouristGuideSerializer,
)

class AgencyListView(generics.ListAPIView):
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer

class AgencyRegisterView(generics.CreateAPIView):
    queryset = Agency.objects.all()
    serializer_class = AgencySerializer
    permission_classes = [AllowAny]


class AgencyApproveView(generics.UpdateAPIView):
    queryset = Agency.objects.all()
    serializer_class = AgencyApprovalSerializer
    permission_classes = [IsAdminUser]


class TouristGuideCreateView(generics.CreateAPIView):
    queryset = TouristGuide.objects.all()
    serializer_class = TouristGuideSerializer
    permission_classes = [AllowAny]


class TouristGuideListView(generics.ListAPIView):
    queryset = TouristGuide.objects.filter(is_active=True)
    serializer_class = TouristGuideSerializer
    permission_classes = [AllowAny]
