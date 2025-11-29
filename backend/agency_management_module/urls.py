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
    # 1. Agency List (Matches Admin & Mobile App)
    # Frontend calls: api.get('/api/agencies/')
    path("agencies/", AgencyListView.as_view(), name="agency-list"), 
    
    # 2. Agency Actions
    path("agency/register/", AgencyRegisterView.as_view(), name="agency-register"),
    path("agency/<int:pk>/approve/", AgencyApproveView.as_view(), name="agency-approve"),
    
    # 3. Guide Management (Matches Agency Dashboard)
    # Frontend calls: api.get('api/agency/guides/')
    path("agency/guides/", TouristGuideListView.as_view(), name="agency-guide-list"),
    path("agency/guides/create/", TouristGuideCreateView.as_view(), name="agency-guide-create"),
    
    # Frontend calls: api.delete(`api/agency/guides/${id}/`)
    path("agency/guides/<int:pk>/", TouristGuideDetailView.as_view(), name="agency-guide-detail"),
]