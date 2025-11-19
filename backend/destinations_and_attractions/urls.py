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

# Import all views (Both Old and New)
from .views import (
    DestinationViewSet, 
    AttractionViewSet, 
    DestinationAttractionListView,
    CreateTourView,     # NEW: Handles the React Native 'Add Tour' form
    MyToursListView     # NEW: Lists tours owned by the specific guide
)

# Initialize Router
router = DefaultRouter()
router.register(r'destinations', DestinationViewSet, basename='destination')
router.register(r'attractions', AttractionViewSet, basename='attraction')

# --- Main URL Patterns ---
urlpatterns = [
    # 1. Router URLs (Destinations & Attractions CRUD)
    # e.g., GET /api/tours/destinations/
    path('', include(router.urls)),
    
    # 2. Nested Attraction List (Existing)
    # e.g., GET /api/tours/destinations/1/attractions/
    path(
        'destinations/<int:destination_pk>/attractions/', 
        DestinationAttractionListView.as_view(), 
        name='destination-attraction-list'
    ),

    # 3. Tour Packages (NEW ADDITIONS)
    
    # POST /api/tours/create/
    # Used by React Native 'AddTour.js' to upload text + images
    path('create/', CreateTourView.as_view(), name='create-tour'),

    # GET /api/tours/my-tours/
    # Used to show the guide their own created tours
    path('my-tours/', MyToursListView.as_view(), name='my-tours'),
    
]

# Note: Usually, static/media serving is done in the PROJECT-level urls.py, 
# not the APP-level urls.py. But if you are including this in the main project,
# ensure this line exists somewhere in your url configuration.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)