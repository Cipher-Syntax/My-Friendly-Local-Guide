from django.urls import path, include
from rest_framework.routers import DefaultRouter #type: ignore
from .views import PaymentViewSet, PaymentInitiationView, PaymentWebhookView

router = DefaultRouter()
# Read-only access to user's payment history
router.register(r'history', PaymentViewSet, basename='payment-history')

urlpatterns = [
    # Router for history
    path('', include(router.urls)),
    
    # 1. Payment Initiation (Tourist POST)
    path(
        'initiate/', 
        PaymentInitiationView.as_view(), 
        name='payment-initiate'
    ),
    
    # 2. Webhook Endpoint (Gateway POST)
    path(
        'webhook/', 
        PaymentWebhookView.as_view(), 
        name='payment-webhook'
    ),
]