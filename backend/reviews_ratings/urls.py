from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import ReviewViewSet, DestinationReviewViewSet

router = DefaultRouter()
router.register(r'reviews', ReviewViewSet)
router.register(r'destination_reviews', DestinationReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
