from django.urls import path
from .views import (
    AgencyRegisterView,
    AgencyApproveView,
    TouristGuideCreateView,
    TouristGuideListView,
    AgencyListView,
    TouristGuideDetailView
)

urlpatterns = [
    path("agencies/", AgencyListView.as_view(), name="agency-list"), 
    path("agency/register/", AgencyRegisterView.as_view(), name="agency-register"),
    path("agency/<int:pk>/approve/", AgencyApproveView.as_view(), name="agency-approve"),
    
    path("agency/guides/", TouristGuideListView.as_view(), name="agency-guide-list"),
    path("agency/guides/create/", TouristGuideCreateView.as_view(), name="agency-guide-create"),
    
    path("agency/guides/<int:pk>/", TouristGuideDetailView.as_view(), name="agency-guide-detail"),
]