# system_management_module/urls.py

from django.urls import path
from .views import (
    GuideApplicationSubmissionView, 
    GuideReviewRequestViewSet,
    UserAlertListView,         # <-- Ensure this is correctly imported
    UserAlertMarkReadView,      # <-- Ensure this is correctly imported
    UnreadAlertCountView
)

urlpatterns = [
    # Guide Submission (Tourist action)
    path('guide-application/submit/', GuideApplicationSubmissionView.as_view(), name='guide-app-submit'),
    
    # Admin Endpoints (Admin required)
    path('admin/guide-reviews/', GuideReviewRequestViewSet.as_view(), name='admin-guide-review-list'), # Simplified view calls
    path('admin/guide-reviews/<int:pk>/', GuideReviewRequestViewSet.as_view(), name='admin-guide-review-detail'),
    
    # User Alerts (User action)
    path('alerts/', UserAlertListView.as_view(), name='user-alerts-list'),
    path('alerts/<int:id>/read/', UserAlertMarkReadView.as_view(), name='user-alert-mark-read'),
    path('alerts/unread-count/', UnreadAlertCountView.as_view(), name='unread-alert-count'),
]