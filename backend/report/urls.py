from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
# IMPORT CHANGE: Import the two specific view classes
from .views import ReportCreateView, ReportAdminViewSet 

router = DefaultRouter()
# 1. ADMIN PATH: Register the ReadOnlyModelViewSet for staff review access
# Maps to: /api/reports/review/ (GET list, GET detail)
router.register(r'review', ReportAdminViewSet, basename='report-review')

urlpatterns = [
    # 2. SUBMISSION PATH: Maps the POST request from the client/user
    # POST: /api/reports/submit/
    path(
        'submit/', 
        ReportCreateView.as_view(), 
        name='report-submit'
    ),
    
    # 3. Router Paths
    path('', include(router.urls)),
]