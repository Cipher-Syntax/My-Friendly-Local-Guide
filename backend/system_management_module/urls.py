from django.urls import path
from .views import (
    GuideApplicationSubmissionView, 
    GuideReviewRequestViewSet,
    UserAlertListView,
    UserAlertMarkReadView,
    UnreadAlertCountView,
    CreateSystemAlertView,
    AdminDashboardSummaryView,
    PushTokenRegisterView,
    PushTokenUnregisterView,
)

urlpatterns = [
    path('guide-application/submit/', GuideApplicationSubmissionView.as_view(), name='guide-app-submit'),
    
    path('admin/guide-reviews/', GuideReviewRequestViewSet.as_view({'get': 'list'}), name='admin-guide-review-list'),
    path('admin/guide-reviews/<int:pk>/', GuideReviewRequestViewSet.as_view({'get': 'retrieve', 'patch': 'update'}), name='admin-guide-review-detail'),
    
    path('alerts/create/', CreateSystemAlertView.as_view(), name='create-system-alert'),
    path('alerts/', UserAlertListView.as_view(), name='user-alerts-list'),
    path('alerts/<int:id>/read/', UserAlertMarkReadView.as_view(), name='user-alert-mark-read'),
    path('alerts/unread-count/', UnreadAlertCountView.as_view(), name='unread-alert-count'),
    path('push-tokens/register/', PushTokenRegisterView.as_view(), name='push-token-register'),
    path('push-tokens/unregister/', PushTokenUnregisterView.as_view(), name='push-token-unregister'),
    
    path('dashboard-summary/', AdminDashboardSummaryView.as_view(), name='dashboard-summary'),
]