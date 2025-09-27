from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import PersonalizationViewSet

router = DefaultRouter()
router.register(r'personalizations', PersonalizationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
