from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ReviewViewSet, DestinationReviewViewSet, trigger_review_reminders

router = DefaultRouter()
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'destination_reviews', DestinationReviewViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Add the webhook URL here
    path('trigger-reminders/', trigger_review_reminders, name='trigger_reminders'),
]