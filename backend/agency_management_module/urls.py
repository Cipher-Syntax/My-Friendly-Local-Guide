from django.urls import path #type: ignore
from .views import (
    AgencyRegisterView,
    AgencyApproveView,
    TouristGuideCreateView,
    TouristGuideListView,
    AgencyListView,
    AgencyDetailView,
    TouristGuideDetailView,
    AgencyProfileView
)

urlpatterns = [
    path("agencies/", AgencyListView.as_view(), name="agency-list"), 
    path("agency-profile-public/<int:pk>/", AgencyDetailView.as_view(), name="agency-public-detail"),
    path("agency/register/", AgencyRegisterView.as_view(), name="agency-register"),
    path("agency/<int:pk>/approve/", AgencyApproveView.as_view(), name="agency-approve"),
    
    path("agency/guides/", TouristGuideListView.as_view(), name="agency-guide-list"),
    path("agency/guides/create/", TouristGuideCreateView.as_view(), name="agency-guide-create"),
    
    path("agency/guides/<int:pk>/", TouristGuideDetailView.as_view(), name="agency-guide-detail"),
    path('agency/profile/', AgencyProfileView.as_view(), name='agency-profile')
]