from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
# IMPORT CHANGE: Ensure you import all necessary views, including the custom one
from .views import AccommodationViewSet, BookingViewSet, BookingStatusUpdateView 
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
# Added basename for clarity
router.register(r'accommodations', AccommodationViewSet, basename='accommodation')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    # 1. Router URLs (Handles List, Retrieve, Create, Delete for Accommodations & Bookings)
    path('', include(router.urls)),
    
    # 2. Custom Action URL (Host/Guide Status Management)
    # This endpoint handles logic for Accepted, Declined, Paid, and Completed status changes.
    # Example: POST/PUT to /api/bookings/1/status/
    path(
        'bookings/<int:pk>/status/', 
        BookingStatusUpdateView.as_view(), 
        name='booking-status-update'
    ),
]

# Add Media URL patterns for serving images
urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)