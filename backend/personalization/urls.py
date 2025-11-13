from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import PersonalizationViewSet

router = DefaultRouter()
# Registering the ViewSet. This will create routes like /personalizations/ and /personalizations/<pk>/
router.register(r'personalizations', PersonalizationViewSet, basename='personalization')

urlpatterns = [
    path('', include(router.urls)),
]