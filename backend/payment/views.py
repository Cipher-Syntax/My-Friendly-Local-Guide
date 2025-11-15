from rest_framework import viewsets, generics, permissions, status #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.exceptions import ValidationError #type: ignore
from .models import Payment
from .serializers import PaymentSerializer, PaymentInitiationSerializer
from accommodation_booking.models import Booking
from datetime import date
import uuid

# --- Utility Functions (Payment Gateway Interaction) ---
def create_payment_intent(amount):
    """Simulates communication with a payment gateway."""
    transaction_id = str(uuid.uuid4())
    checkout_url = f"https://payment.gateway.com/checkout/{transaction_id}"
    
    return {
        "transaction_id": transaction_id,
        "amount": amount,
        "checkout_url": checkout_url,
    }
# --- End Utility Functions ---


# --- ViewSets for History ---

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Allows tourists to view their past payment records (Read Only).
    """
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Users can only see payments they initiated
        return Payment.objects.filter(payer=self.request.user).order_by('-timestamp')


# --- Generic Views for Actions ---

class PaymentInitiationView(generics.CreateAPIView):
    """
    Endpoint for a Tourist to initiate payment for an ACCEPTED Booking/Fee.
    Creates a Payment record and returns the checkout URL.
    """
    serializer_class = PaymentInitiationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        
        booking = serializer.booking_instance if hasattr(serializer, 'booking_instance') else None
        final_amount = serializer.validated_data['final_amount']
        
        if final_amount <= 0:
            raise ValidationError({"detail": "Payment amount must be greater than zero."})

        # 1. Simulate gateway interaction
        gateway_data = create_payment_intent(amount=final_amount)
        payment_method = serializer.validated_data['payment_method']
        payment_type = serializer.validated_data['payment_type']

        # 2. Create Payment Record (Status: pending)
        payment = Payment.objects.create(
            payer=user,
            payment_type=payment_type, 
            related_booking=booking,
            amount=final_amount,
            service_fee=0.00, 
            payment_method=payment_method,
            gateway_transaction_id=gateway_data['transaction_id'],
            status='pending',
            gateway_response={"checkout_url": gateway_data['checkout_url']}
        )
        
        # 3. Update Booking status to 'Paid'
        if booking and payment_type != 'RegistrationFee': 
            booking.status = 'Paid'
            booking.save()

        # 4. Return Checkout URL to the frontend
        return Response({
            "payment_id": payment.id,
            "amount": payment.amount,
            "checkout_url": gateway_data['checkout_url']
        }, status=status.HTTP_201_CREATED)


class PaymentWebhookView(APIView):
    """
    Handles webhook notification from the payment gateway.
    Updates the Payment status and the associated Booking/User status upon SUCCESS.
    """
    permission_classes = [permissions.AllowAny] 

    def post(self, request, *args, **kwargs):
        event_data = request.data
        transaction_id = event_data.get('transaction_id') 
        new_status = event_data.get('status') 

        if not transaction_id or new_status not in ['succeeded', 'failed']:
            return Response({"detail": "Invalid webhook payload."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment = Payment.objects.get(gateway_transaction_id=transaction_id)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment record not found."}, status=status.HTTP_404_NOT_FOUND)

        # 1. Handle Succeeded Status
        if new_status == 'succeeded' and payment.status != 'succeeded':
            payment.status = 'succeeded'
            payment.gateway_response = event_data
            payment.save()
            
            # --- CRUCIAL LOGIC: FINAL GUIDE APPROVAL ---
            if payment.payment_type == 'RegistrationFee':
                user = payment.payer
                # The user is now officially a guide!
                if user.is_local_guide and not user.guide_approved:
                    user.guide_approved = True  # FINAL APPROVAL
                    user.save()
            # ----------------------------------------
            
            # 2. Update Booking Status to Paid
            if payment.related_booking and payment.related_booking.status != 'Paid':
                booking = payment.related_booking
                booking.status = 'Paid'
                booking.save()
                
            return Response({"detail": "Payment succeeded and status updated."}, status=status.HTTP_200_OK)

        # 3. Handle Failed Status
        elif new_status == 'failed' and payment.status != 'failed':
            payment.status = 'failed'
            payment.gateway_response = event_data
            payment.save()
            
            # Revert Booking status to allow retry (if applicable)
            if payment.related_booking:
                 payment.related_booking.status = 'Accepted' 
                 payment.related_booking.save()
            
            return Response({"detail": "Payment failed. Status updated."}, status=status.HTTP_200_OK)
            
        return Response({"detail": "Status unchanged."}, status=status.HTTP_200_OK)