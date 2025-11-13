from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import (
    CreateUserView, UpdateUserView, PasswordResetRequestView, PasswordResetConfirmView,
    ApplyAsGuideView, ApprovedLocalGuideListView, GuideApplicationSubmissionView # <-- NEW Import
)
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    # Auth Endpoints
    path('register/', CreateUserView.as_view(), name='register'),
    path('profile/', UpdateUserView.as_view(), name='profile-update'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/<str:uid>/<str:token>/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # Guide Functionality
    path('guide/apply/role/', ApplyAsGuideView.as_view(), name='apply-as-guide-role'),
    
    # NEW: Document/Application Submission
    path('guide/apply/documents/', GuideApplicationSubmissionView.as_view(), name='apply-as-guide-documents'), 
    
    path('guides/', ApprovedLocalGuideListView.as_view(), name='approved-guide-list'),
]

urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)