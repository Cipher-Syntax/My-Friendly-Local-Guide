from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import PaymentViewSet, PaymentInitiationView, PaymentWebhookView, PaymentStatusView, SubscriptionPriceView

router = DefaultRouter()
# Read-only access to user's payment history
router.register(r'history', PaymentViewSet, basename='payment-history')

urlpatterns = [
    # Router for history
    path('', include(router.urls)),
    
    path("initiate/", PaymentInitiationView.as_view(), name="payment-initiate"),
    path("webhook/", PaymentWebhookView.as_view(), name="payment-webhook"),
    path('status/<int:payment_id>/', PaymentStatusView.as_view(), name='payment-status'),
    path("subscription-price/", SubscriptionPriceView.as_view(), name="subscription-price"),

]