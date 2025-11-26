import uuid
from decimal import Decimal
from datetime import date, timedelta
from django.conf import settings
from rest_framework import generics, permissions, status, viewsets #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.exceptions import ValidationError #type: ignore
from django.apps import apps 
# from rest_framework.permissions import AllowAny  #type: ignore

from .models import Payment
from .serializers import PaymentSerializer, PaymentInitiationSerializer
from .paymongo import create_payment_link

# Safely get Booking model reference, required for ForeignKey creation
try:
    Booking = apps.get_model('accommodation_booking', 'Booking')
except LookupError:
    Booking = None 


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(payer=self.request.user).order_by("-timestamp")


class PaymentInitiationView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    SUBSCRIPTION_PRICE = Decimal("3000.00")  # Yearly subscription price

    def post(self, request, *args, **kwargs):
        serializer = PaymentInitiationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        payment_type = serializer.validated_data["payment_type"]
        
        payment_method = serializer.validated_data["payment_method"]
        
        description = ""
        final_amount = Decimal("0.00")
        method_types = [] # Default to all payment methods

        if payment_type == "YearlySubscription":
            final_amount = self.SUBSCRIPTION_PRICE
            description = "Guide Yearly Subscription"
            if payment_method == 'GCash':
                method_types = ['gcash']
        elif payment_type == "Booking":
            booking = getattr(serializer, "booking_instance", None)
            if not booking:
                raise ValidationError({"detail": "Booking is required for this payment type."})
            final_amount = serializer.validated_data["final_amount"]
            description = f"Booking Payment for Booking #{booking.id}"
            if payment_method == 'GCash':
                method_types = ['gcash']
        else:
            raise ValidationError({"detail": "Invalid payment type."})

        if final_amount <= 0:
            raise ValidationError({"detail": "Invalid payment amount."})

        transaction_uuid = str(uuid.uuid4())

        billing_data = {
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "phone": getattr(user, "phone_number", "")
        }

        try:
            paymongo_response = create_payment_link(
                amount=final_amount,
                description=description,
                external_id=transaction_uuid,
                billing=billing_data,
                method_types=method_types
            )
        except RuntimeError as e:
            raise ValidationError({"detail": str(e)})

        checkout_url = paymongo_response.get("data", {}).get("attributes", {}).get("checkout_url")
        paymongo_ref_id = paymongo_response.get("data", {}).get("attributes", {}).get("reference_number")
        
        if not checkout_url or not paymongo_ref_id:
            raise ValidationError({"detail": "Failed to create payment link."})

        Payment.objects.create(
            payer=user,
            payment_type=payment_type,
            related_booking=getattr(serializer, "booking_instance", None),
            amount=final_amount,
            payment_method=serializer.validated_data["payment_method"],
            gateway_transaction_id=paymongo_ref_id,
            status="pending",
            gateway_response=paymongo_response
        )

        return Response({
            "checkout_url": checkout_url
        }, status=status.HTTP_201_CREATED)


class PaymentWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        print(f"--- PAYMONGO WEBHOOK RECEIVED ---")
        print(f"DATA: {data}")
        
        # Access the Link object attributes within the event data
        event_data = data.get("data", {})
        attributes = event_data.get("attributes", {})
        # The actual resource object (like a payment or link) is nested inside 'data'
        resource = attributes.get("data", {})
        resource_attributes = resource.get("attributes", {})
        
        # FIX: Extract the reference_number that was saved to the DB
        # For links, the ref number is in the resource itself.
        external_id = resource_attributes.get("reference_number") 
        
        # Determine the status based on the Link object status
        status_check = resource_attributes.get("status")
        
        # More robust status check
        successful_statuses = ['paid', 'succeeded', 'successful']
        paid = status_check in successful_statuses

        if not external_id:
            # If still missing, log the error and return 400
            print("WEBHOOK ERROR: Missing external_id (reference_number) in payload:", data)
            return Response({"detail": "Missing external_id"}, status=400) 

        try:
            # Match the PayMongo reference_number to your gateway_transaction_id
            payment = Payment.objects.get(gateway_transaction_id=external_id)
        except Payment.DoesNotExist:
            # This is what generates the 404 Not Found response
            print(f"WEBHOOK ERROR: Payment not found for ID: {external_id}")
            return Response({"detail": "Payment not found"}, status=404)

        # Update payment record
        payment.status = "succeeded" if paid else "failed"
        payment.gateway_response = data
        payment.save()

        # Update booking if applicable
        if payment.related_booking and payment.status == "succeeded":
            booking = payment.related_booking
            booking.status = "Paid"
            booking.save()

        # Approve guide if yearly subscription succeeded
        if payment.payment_type == "YearlySubscription" and payment.status == "succeeded":
            user = payment.payer
            user.guide_tier = 'paid'
            user.subscription_end_date = date.today() + timedelta(days=365)
            user.save()

        return Response({"status": "Webhook processed"}, status=200)
    
class PaymentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, payment_id):
        try:
            payment = Payment.objects.get(id=payment_id, payer=request.user)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=404)
        
        return Response({
            "status": payment.status,
            "payment_type": payment.payment_type,
            "amount": str(payment.amount), 
        })
    
