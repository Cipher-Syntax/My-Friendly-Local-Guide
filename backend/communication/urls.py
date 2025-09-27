from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import MessageViewSet

router = DefaultRouter()
router.register(r'messages', MessageViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

