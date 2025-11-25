from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from django.conf import settings
from django.conf.urls.static import static

# Import all views
from .views import (
    DestinationViewSet, 
    AttractionViewSet, 
    DestinationAttractionListView,
    CreateTourView,
    MyToursListView,
    ToursByDestinationListView,
    TourDetailView,
    GuideListView  # NEW: Add this import
)

# Initialize Router
router = DefaultRouter()
router.register(r'destinations', DestinationViewSet, basename='destination')
router.register(r'attractions', AttractionViewSet, basename='attraction')

# --- Main URL Patterns ---
urlpatterns = [
    # 1. Router URLs (Destinations & Attractions CRUD)
    path('', include(router.urls)),
    
    # 2. Nested Attraction List
    path(
        'destinations/<int:destination_pk>/attractions/', 
        DestinationAttractionListView.as_view(), 
        name='destination-attraction-list'
    ),

    # 3. Guides - NEW
    path('guide-list/', GuideListView.as_view(), name='guide-list'),

    # 4. Tour Packages
    path('create/', CreateTourView.as_view(), name='create-tour'),
    path('my-tours/', MyToursListView.as_view(), name='my-tours'),
    path(
        'destinations/<int:destination_id>/tours/',
        ToursByDestinationListView.as_view(),
        name='tours-by-destination'
    ),
    path('tours/<int:pk>/', TourDetailView.as_view(), name='tour-detail'),
]

urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)