from django.urls import path, include
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView # type: ignore
from django.conf import settings
from django.conf.urls.static import static

from .views import (
    CreateUserView, 
    UpdateUserView, 
    AdminUpdateUserView,
    PasswordResetRequestView, 
    PasswordResetConfirmView,
    ApplyAsGuideView, 
    ApprovedLocalGuideListView, 
    GuideDetailView, 
    AgencyListView, 
    GuideApplicationSubmissionView, 
    VerifyEmailView, 
    UpdateGuideInfoView, 
    ResendVerificationEmailView,
    AdminTokenObtainPairView,
    AgencyTokenObtainPairView,
    AcceptTermsView
)


urlpatterns = [
    # 1. JWT TOKEN ENDPOINTS (CRITICAL FOR AUTHENTICATION)
    # POST to get access and refresh tokens (Regular User Login)
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'), 
    # POST to get a new access token using the refresh token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'), 
    
    # --- NEW ADMIN LOGIN ENDPOINT ---
    path('auth/admin/login/', AdminTokenObtainPairView.as_view(), name='admin_login'),
    path('auth/agency/login/', AgencyTokenObtainPairView.as_view(), name='agency_login'),

    path('verify-email/<uid>/<token>/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verify-email/', ResendVerificationEmailView.as_view(), name='resend-verify-email'),
    
    # 2. AUTH & USER ENDPOINTS
    path('register/', CreateUserView.as_view(), name='register'),
    path('profile/', UpdateUserView.as_view(), name='profile-update'),
    path('accept-terms/', AcceptTermsView.as_view(), name='accept-terms'),
    path('admin/users/<int:pk>/', AdminUpdateUserView.as_view(), name='admin-user-update'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/<str:uid>/<str:token>/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    
    # 3. GUIDE FUNCTIONALITY
    path('guide/apply/role/', ApplyAsGuideView.as_view(), name='apply-as-guide-role'),
    path('guide/apply/documents/', GuideApplicationSubmissionView.as_view(), name='apply-as-guide-documents'), 
    path('guides/', ApprovedLocalGuideListView.as_view(), name='approved-guide-list'),
    path('guides/<int:pk>/', GuideDetailView.as_view(), name='guide-detail'),
    path('agencies/', AgencyListView.as_view(), name='agency-list'),

    path('guide/update-info/', UpdateGuideInfoView.as_view(), name='update-guide-info'),
    
]

# 4. MEDIA FILES
urlpatterns = urlpatterns + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)