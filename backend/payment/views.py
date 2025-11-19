import uuid
from decimal import Decimal
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

    REGISTRATION_DETAILS = {
        "base_amount": Decimal("500.00"),
        "service_fee": Decimal("50.00")
    }
    
    def post(self, request, *args, **kwargs):
        serializer = PaymentInitiationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        booking = getattr(serializer, "booking_instance", None)
        booking_id = booking.id if booking else None
        
        payment_type = serializer.validated_data["payment_type"]
        payment_method = serializer.validated_data["payment_method"]

        # ----- Calculate final amount -----
        if payment_type == "RegistrationFee":
            base = self.REGISTRATION_DETAILS["base_amount"]
            fee = self.REGISTRATION_DETAILS["service_fee"]
            final = base + fee
        else:
            final = serializer.validated_data["final_amount"]
            fee = Decimal("0.00")

        if final <= 0:
            raise ValidationError({"detail": "Invalid payment amount."})

        # Generate UUID for PayMongo API call (as external_id)
        transaction_uuid = str(uuid.uuid4())

        # Prepare billing info
        billing_data = {
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "phone": getattr(user, "phone_number", "")
        }

        # Description for PayMongo
        description = (
            "Guide Registration Fee"
            if payment_type == "RegistrationFee"
            else f"Booking Payment for Booking #{booking_id}"
        )

        # ----- Call PayMongo API -----
        try:
            paymongo_response = create_payment_link(
                amount=final,
                description=description,
                external_id=transaction_uuid, # Pass the UUID here
                billing=billing_data
            )
        except RuntimeError as e:
            print(f"PAYMONGO CALL FAILED: {str(e)}")
            raise ValidationError({"detail": str(e)})

        # Get the two necessary IDs from PayMongo
        checkout_url = paymongo_response.get("data", {}).get("attributes", {}).get("checkout_url")
        # FIX: Extract the PayMongo generated 'reference_number' (e.g., X2HAWBL)
        paymongo_ref_id = paymongo_response.get("data", {}).get("attributes", {}).get("reference_number")
        
        if not checkout_url:
            print("PAYMONGO RESPONSE MISSING checkout_url", paymongo_response)
            raise ValidationError({"detail": "No checkout URL returned from PayMongo."})
            
        if not paymongo_ref_id:
             print("PAYMONGO RESPONSE MISSING reference_number", paymongo_response)
             raise ValidationError({"detail": "No reference number returned from PayMongo."})

        print(f"PayMongo Success - Checkout URL: {checkout_url}")

        # ----- Save Payment -----
        payment = Payment.objects.create(
            payer=user,
            payment_type=payment_type,
            related_booking=booking,
            amount=final,
            service_fee=fee,
            payment_method=payment_method,
            # FIX: Store the short PayMongo reference_number for webhook matching
            gateway_transaction_id=paymongo_ref_id, 
            status="pending",
            gateway_response=paymongo_response
        )

        # ----- FINAL RESPONSE TO FRONTEND -----
        return Response({
            "payment_id": payment.id,
            # Return the short PayMongo ID to the frontend (used as transaction_id)
            "transaction_id": paymongo_ref_id, 
            "amount": str(final.quantize(Decimal('0.01'))), 
            "checkout_url": checkout_url
        }, status=status.HTTP_201_CREATED)


class PaymentWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        
        # Access the Link object attributes within the event data
        event_data = data.get("data", {})
        link_attributes = event_data.get("attributes", {}).get("data", {}).get("attributes", {})
        
        # FIX: Extract the reference_number that was saved to the DB
        external_id = link_attributes.get("reference_number") 
        
        # Determine the status based on the Link object status
        status_check = link_attributes.get("status")
        paid = (status_check == 'paid')

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

        # Approve guide if registration fee succeeded
        if payment.payment_type == "RegistrationFee" and payment.status == "succeeded":
            user = payment.payer
            if user.is_local_guide and not user.guide_approved:
                user.guide_approved = True
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