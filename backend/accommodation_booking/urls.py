from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import (
    AccommodationViewSet, 
    BookingViewSet, 
    BookingStatusUpdateView, 
    AssignGuidesView,
    AccommodationDropdownListView
)
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'accommodations', AccommodationViewSet, basename='accommodation')
router.register(r'bookings', BookingViewSet, basename='booking')

urlpatterns = [
    path('accommodations/list/', AccommodationDropdownListView.as_view(), name='accommodation-dropdown-list'),
    path(
        'bookings/<int:pk>/status/', 
        BookingStatusUpdateView.as_view(), 
        name='booking-status-update'
    ),
    path(
        'bookings/<int:pk>/assign-guides/',
        AssignGuidesView.as_view(),
        name='assign-guides'
    ),
    path('', include(router.urls)),
]

urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)