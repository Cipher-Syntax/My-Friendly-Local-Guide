from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from django.conf import settings
from django.conf.urls.static import static

from .views import (
    DestinationViewSet, 
    AttractionViewSet, 
    DestinationAttractionListView,
    CreateTourView,
    MyToursListView,
    ToursByDestinationListView,
    TourDetailView,
    GuideListView,
    GuideToursListView,
    GuideDestinationsListView # Import the new view
)

router = DefaultRouter()
router.register(r'destinations', DestinationViewSet, basename='destination')
router.register(r'attractions', AttractionViewSet, basename='attraction')

urlpatterns = [
    path('', include(router.urls)),
    
    path(
        'destinations/<int:destination_pk>/attractions/', 
        DestinationAttractionListView.as_view(), 
        name='destination-attraction-list'
    ),

    path('guide-list/', GuideListView.as_view(), name='guide-list'),

    path('create/', CreateTourView.as_view(), name='create-tour'),
    path('my-tours/', MyToursListView.as_view(), name='my-tours'),
    
    path('guides/<int:guide_id>/tours/', GuideToursListView.as_view(), name='guide-tours-list'),
    
    # NEW URL FOR GUIDE'S DESTINATIONS
    path('guides/<int:guide_id>/destinations/', GuideDestinationsListView.as_view(), name='guide-destinations-list'),

    path(
        'destinations/<int:destination_id>/tours/',
        ToursByDestinationListView.as_view(),
        name='tours-by-destination'
    ),
    path('tours/<int:pk>/', TourDetailView.as_view(), name='tour-detail'),
]

urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)