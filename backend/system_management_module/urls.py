from django.urls import path
from .views import (
    GuideApplicationSubmissionView, 
    GuideReviewRequestViewSet,
    UserAlertListView,
    UserAlertMarkReadView,
    UnreadAlertCountView
)

urlpatterns = [
    # Guide Submission
    path('guide-application/submit/', GuideApplicationSubmissionView.as_view(), name='guide-app-submit'),
    
    # Admin Endpoints (Using ModelViewSet binding)
    path('admin/guide-reviews/', GuideReviewRequestViewSet.as_view({'get': 'list'}), name='admin-guide-review-list'),
    path('admin/guide-reviews/<int:pk>/', GuideReviewRequestViewSet.as_view({'get': 'retrieve', 'patch': 'update'}), name='admin-guide-review-detail'),
    
    # User Alerts
    path('alerts/', UserAlertListView.as_view(), name='user-alerts-list'),
    path('alerts/<int:id>/read/', UserAlertMarkReadView.as_view(), name='user-alert-mark-read'),
    path('alerts/unread-count/', UnreadAlertCountView.as_view(), name='unread-alert-count'),
]