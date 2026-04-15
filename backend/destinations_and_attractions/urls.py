from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from django.conf import settings
from django.conf.urls.static import static

from .views import (
    DestinationNewPackageHighlightsView,
    DestinationViewSet, 
    AttractionViewSet, 
    DestinationAttractionListView,
    CategoryChoicesView,
    MunicipalityChoicesView,
    LocationSearchView,
    LocationCorrectionListCreateView,
    LocationCorrectionReviewView,
    CreateTourView,
    MyToursListView,
    ToursByDestinationListView,
    TourDetailView,
    GuideListView,
    GuideToursListView,
    GuideDestinationsListView,
)

router = DefaultRouter()
router.register(r'destinations', DestinationViewSet, basename='destination')
router.register(r'attractions', AttractionViewSet, basename='attraction')

urlpatterns = [
    path(
        'destinations/new-package-highlights/',
        DestinationNewPackageHighlightsView.as_view(),
        name='destination-new-package-highlights',
    ),
    path('', include(router.urls)),
    
    path('categories/', CategoryChoicesView.as_view(), name='category-choices'),
    path('locations/municipalities/', MunicipalityChoicesView.as_view(), name='location-municipality-choices'),
    path('locations/search/', LocationSearchView.as_view(), name='location-search'),
    path('location-corrections/', LocationCorrectionListCreateView.as_view(), name='location-correction-list-create'),
    path('location-corrections/<int:pk>/review/', LocationCorrectionReviewView.as_view(), name='location-correction-review'),
    
    path(
        'destinations/<int:destination_pk>/attractions/', 
        DestinationAttractionListView.as_view(), 
        name='destination-attraction-list'
    ),

    path('guide-list/', GuideListView.as_view(), name='guide-list'),

    path('create/', CreateTourView.as_view(), name='create-tour'),
    path('my-tours/', MyToursListView.as_view(), name='my-tours'),
    
    path('guides/<int:guide_id>/tours/', GuideToursListView.as_view(), name='guide-tours-list'),
    
    path('guides/<int:guide_id>/destinations/', GuideDestinationsListView.as_view(), name='guide-destinations-list'),

    path(
        'destinations/<int:destination_id>/tours/',
        ToursByDestinationListView.as_view(),
        name='tours-by-destination'
    ),
    path('tours/<int:pk>/', TourDetailView.as_view(), name='tour-detail'),
]

urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)