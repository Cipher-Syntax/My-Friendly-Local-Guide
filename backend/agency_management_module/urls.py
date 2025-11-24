# app/urls.py

from django.urls import path
from .views import (
    AgencyRegisterView,
    AgencyApproveView,
    TouristGuideCreateView,
    TouristGuideListView,
    AgencyListView,
)

urlpatterns = [
    # path("agencies/", AgencyListView.as_view(), name="agency-list"),
    path("agency/register/", AgencyRegisterView.as_view()),
    path("agency/<int:pk>/approve/", AgencyApproveView.as_view()),
    path("guides/create/", TouristGuideCreateView.as_view()),
    path("guides/", TouristGuideListView.as_view()),
    
]
