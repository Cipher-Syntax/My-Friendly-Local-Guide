from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import (
    PaymentViewSet,
    PaymentInitiationView,
    PaymentWebhookView,
    PaymentStatusView,
    SubscriptionPriceView,
    RefundRequestCreateView,
    MyRefundRequestListView,
    ProviderRefundRequestListView,
    AdminRefundRequestListView,
    RefundRequestDetailView,
    RefundRequestProcessView,
)

router = DefaultRouter()
router.register(r'history', PaymentViewSet, basename='payment-history')

urlpatterns = [
    path('', include(router.urls)),
    
    path("initiate/", PaymentInitiationView.as_view(), name="payment-initiate"),
    path("webhook/", PaymentWebhookView.as_view(), name="payment-webhook"),
    path('status/<int:payment_id>/', PaymentStatusView.as_view(), name='payment-status'),
    path("subscription-price/", SubscriptionPriceView.as_view(), name="subscription-price"),

    path('refunds/request/', RefundRequestCreateView.as_view(), name='refund-request'),
    path('refunds/my/', MyRefundRequestListView.as_view(), name='refund-list-my'),
    path('refunds/provider/', ProviderRefundRequestListView.as_view(), name='refund-list-provider'),
    path('refunds/admin/', AdminRefundRequestListView.as_view(), name='refund-list-admin'),
    path('refunds/<int:refund_id>/', RefundRequestDetailView.as_view(), name='refund-detail'),
    path('refunds/<int:refund_id>/process/', RefundRequestProcessView.as_view(), name='refund-process'),

]