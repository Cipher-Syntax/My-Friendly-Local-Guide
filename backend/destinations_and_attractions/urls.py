# from django.urls import path, include
# from rest_framework.routers import DefaultRouter #type: ignore
# # IMPORT CHANGE: Ensure you import all three necessary views
# from .views import DestinationViewSet, AttractionViewSet, DestinationAttractionListView
# from django.conf import settings
# from django.conf.urls.static import static

# # Initialize Router
# router = DefaultRouter()
# router.register(r'destinations', DestinationViewSet, basename='destination') # Added basename for clarity
# router.register(r'attractions', AttractionViewSet, basename='attraction')

# # --- Main URL Patterns ---
# urlpatterns = [
#     # 1. Router URLs (Handles List, Create, Detail, Update, Delete for Destinations & Attractions)
#     path('', include(router.urls)),
    
#     # 2. Nested Attraction List (NEW ADDITION)
#     # This allows tourists to query all attractions for a specific destination ID:
#     # Example URL: /api/destinations/1/attractions/
#     path(
#         'destinations/<int:destination_pk>/attractions/', 
#         DestinationAttractionListView.as_view(), 
#         name='destination-attraction-list'
#     ),
# ]

# # Add Media URL patterns for serving images (Profile pictures, Destination images, etc.)
# urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static

# Import all views
from .views import (
    DestinationViewSet, 
    AttractionViewSet, 
    DestinationAttractionListView,
    CreateTourView,
    MyToursListView,
    ToursByDestinationListView
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

    # 3. Tour Packages
    path('create/', CreateTourView.as_view(), name='create-tour'),
    path('my-tours/', MyToursListView.as_view(), name='my-tours'),
    path(
        'destinations/<int:destination_id>/tours/',
        ToursByDestinationListView.as_view(),
        name='tours-by-destination'
    ),
]
urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)