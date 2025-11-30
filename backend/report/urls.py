from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import ReportCreateView, ReportAdminViewSet 

router = DefaultRouter()
router.register(r'review', ReportAdminViewSet, basename='report-review')

urlpatterns = [
    path(
        'submit/', 
        ReportCreateView.as_view(), 
        name='report-submit'
    ),
    
    path('', include(router.urls)),
]