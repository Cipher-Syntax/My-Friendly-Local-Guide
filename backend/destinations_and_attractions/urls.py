from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import DestinationViewSet, AttractionViewSet
from django.conf import settings
from django.conf.urls.static import static

router = DefaultRouter()
router.register(r'destinations', DestinationViewSet)
router.register(r'attractions', AttractionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)