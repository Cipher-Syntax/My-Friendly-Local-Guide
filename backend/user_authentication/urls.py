from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView #type: ignore
from .views import UserViewSet
from rest_framework.routers  import DefaultRouter #type: ignore

router = DefaultRouter()
router.register(r'users', UserViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('token/', TokenObtainPairView.as_view(), name='get_token'),
    path('token/refresh/', TokenRefreshView.as_view(), name='refresh_token'),
]
