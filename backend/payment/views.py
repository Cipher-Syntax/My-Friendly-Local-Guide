# from rest_framework import viewsets, generics, permissions, status #type: ignore
# from rest_framework.response import Response #type: ignore
# from rest_framework.views import APIView #type: ignore
# from rest_framework.exceptions import ValidationError #type: ignore
# from .models import Payment
# from .serializers import PaymentSerializer, PaymentInitiationSerializer
# from accommodation_booking.models import Booking
# from datetime import date
# import uuid

# # --- Utility Functions (Payment Gateway Interaction) ---
# def create_payment_intent(amount):
#     """Simulates communication with a payment gateway."""
#     transaction_id = str(uuid.uuid4())
#     checkout_url = f"https://payment.gateway.com/checkout/{transaction_id}"
    
#     return {
#         "transaction_id": transaction_id,
#         "amount": amount,
#         "checkout_url": checkout_url,
#     }
# # --- End Utility Functions ---


# # --- ViewSets for History ---

# class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
#     """
#     Allows tourists to view their past payment records (Read Only).
#     """
#     serializer_class = PaymentSerializer
#     permission_classes = [permissions.IsAuthenticated]
    
#     def get_queryset(self):
#         # Users can only see payments they initiated
#         return Payment.objects.filter(payer=self.request.user).order_by('-timestamp')


# # --- Generic Views for Actions ---

# class PaymentInitiationView(generics.CreateAPIView):
#     """
#     Endpoint for a Tourist to initiate payment for an ACCEPTED Booking/Fee.
#     Creates a Payment record and returns the checkout URL.
#     """
#     serializer_class = PaymentInitiationSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def perform_create(self, serializer):
#         user = self.request.user
        
#         booking = serializer.booking_instance if hasattr(serializer, 'booking_instance') else None
#         final_amount = serializer.validated_data['final_amount']
        
#         if final_amount <= 0:
#             raise ValidationError({"detail": "Payment amount must be greater than zero."})

#         # 1. Simulate gateway interaction
#         gateway_data = create_payment_intent(amount=final_amount)
#         payment_method = serializer.validated_data['payment_method']
#         payment_type = serializer.validated_data['payment_type']

#         # 2. Create Payment Record (Status: pending)
#         payment = Payment.objects.create(
#             payer=user,
#             payment_type=payment_type, 
#             related_booking=booking,
#             amount=final_amount,
#             service_fee=0.00, 
#             payment_method=payment_method,
#             gateway_transaction_id=gateway_data['transaction_id'],
#             status='pending',
#             gateway_response={"checkout_url": gateway_data['checkout_url']}
#         )
        
#         # 3. Update Booking status to 'Paid'
#         if booking and payment_type != 'RegistrationFee': 
#             booking.status = 'Paid'
#             booking.save()

#         # 4. Return Checkout URL to the frontend
#         return Response({
#             "payment_id": payment.id,
#             "amount": payment.amount,
#             "checkout_url": gateway_data['checkout_url']
#         }, status=status.HTTP_201_CREATED)


# class PaymentWebhookView(APIView):
#     """
#     Handles webhook notification from the payment gateway.
#     Updates the Payment status and the associated Booking/User status upon SUCCESS.
#     """
#     permission_classes = [permissions.AllowAny] 

#     def post(self, request, *args, **kwargs):
#         event_data = request.data
#         transaction_id = event_data.get('transaction_id') 
#         new_status = event_data.get('status') 

#         if not transaction_id or new_status not in ['succeeded', 'failed']:
#             return Response({"detail": "Invalid webhook payload."}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             payment = Payment.objects.get(gateway_transaction_id=transaction_id)
#         except Payment.DoesNotExist:
#             return Response({"detail": "Payment record not found."}, status=status.HTTP_404_NOT_FOUND)

#         # 1. Handle Succeeded Status
#         if new_status == 'succeeded' and payment.status != 'succeeded':
#             payment.status = 'succeeded'
#             payment.gateway_response = event_data
#             payment.save()
            
#             # --- CRUCIAL LOGIC: FINAL GUIDE APPROVAL ---
#             if payment.payment_type == 'RegistrationFee':
#                 user = payment.payer
#                 # The user is now officially a guide!
#                 if user.is_local_guide and not user.guide_approved:
#                     user.guide_approved = True  # FINAL APPROVAL
#                     user.save()
#             # ----------------------------------------
            
#             # 2. Update Booking Status to Paid
#             if payment.related_booking and payment.related_booking.status != 'Paid':
#                 booking = payment.related_booking
#                 booking.status = 'Paid'
#                 booking.save()
                
#             return Response({"detail": "Payment succeeded and status updated."}, status=status.HTTP_200_OK)

#         # 3. Handle Failed Status
#         elif new_status == 'failed' and payment.status != 'failed':
#             payment.status = 'failed'
#             payment.gateway_response = event_data
#             payment.save()
            
#             # Revert Booking status to allow retry (if applicable)
#             if payment.related_booking:
#                  payment.related_booking.status = 'Accepted' 
#                  payment.related_booking.save()
            
#             return Response({"detail": "Payment failed. Status updated."}, status=status.HTTP_200_OK)
            
#         return Response({"detail": "Status unchanged."}, status=status.HTTP_200_OK)


# from rest_framework import viewsets, generics, permissions, status #type: ignore
# from rest_framework.response import Response #type: ignore
# from rest_framework.views import APIView #type: ignore
# from rest_framework.exceptions import ValidationError #type: ignore
# from .models import Payment
# from .serializers import PaymentSerializer, PaymentInitiationSerializer
# from accommodation_booking.models import Booking
# from user_authentication.models import User  # Ensure User is imported if needed for direct updates
# from decimal import Decimal
# import uuid

# # --- Utility Functions (Payment Gateway Interaction) ---
# def create_payment_intent(total_amount, base_fee, service_fee):
#     """Simulates communication with a payment gateway."""
#     # In a real PayMongo integration, you'd calculate the fee, include it 
#     # in the total amount for the gateway, and handle payouts later.
#     transaction_id = str(uuid.uuid4())
#     checkout_url = f"https://payment.gateway.com/checkout/{transaction_id}?amount={total_amount}"
    
#     return {
#         "transaction_id": transaction_id,
#         "amount": total_amount,
#         "base_fee": base_fee,
#         "service_fee": service_fee,
#         "checkout_url": checkout_url,
#     }
# # --- End Utility Functions ---


# # --- ViewSets for History ---

# class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
#     """
#     Allows tourists to view their past payment records (Read Only).
#     """
#     serializer_class = PaymentSerializer
#     permission_classes = [permissions.IsAuthenticated]
    
#     def get_queryset(self):
#         # Users can only see payments they initiated
#         return Payment.objects.filter(payer=self.request.user).order_by('-timestamp')


# # --- Generic Views for Actions ---

# class PaymentInitiationView(generics.CreateAPIView):
#     """
#     Endpoint for a Tourist to initiate payment for an ACCEPTED Booking/Fee.
#     Creates a Payment record and returns the checkout URL.
#     """
#     serializer_class = PaymentInitiationSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     # Mock fee details (must match frontend to properly calculate service_fee)
#     REGISTRATION_FEE_DETAILS = {
#         'base_amount': Decimal('500.00'), 
#         'service_fee': Decimal('50.00'),
#     }

#     def perform_create(self, serializer):
#         user = self.request.user
        
#         booking = serializer.booking_instance if hasattr(serializer, 'booking_instance') else None
#         payment_type = serializer.validated_data['payment_type']
#         payment_method = serializer.validated_data['payment_method']
        
#         # Recalculate amount and fee based on type
#         if payment_type == 'RegistrationFee':
#             base_amount = self.REGISTRATION_FEE_DETAILS['base_amount']
#             service_fee_amount = self.REGISTRATION_FEE_DETAILS['service_fee']
#             final_amount = base_amount + service_fee_amount
#         else:
#             # Assuming for 'Booking' or 'Fee', serializer calculates amount/fee
#             final_amount = serializer.validated_data['final_amount']
#             # For simplicity in this mock, we assume service_fee is zero unless RegistrationFee
#             service_fee_amount = Decimal('0.00') 

#         if final_amount <= 0:
#             raise ValidationError({"detail": "Payment amount must be greater than zero."})

#         # 1. Simulate gateway interaction
#         gateway_data = create_payment_intent(
#             total_amount=final_amount,
#             base_fee=(final_amount - service_fee_amount),
#             service_fee=service_fee_amount
#         )

#         # 2. Create Payment Record (Status: pending)
#         payment = Payment.objects.create(
#             payer=user,
#             payment_type=payment_type, 
#             related_booking=booking,
#             amount=final_amount,
#             service_fee=service_fee_amount, # Set the service fee here
#             payment_method=payment_method,
#             gateway_transaction_id=gateway_data['transaction_id'],
#             status='pending',
#             gateway_response={"checkout_url": gateway_data['checkout_url']}
#         )
        
#         # 3. Update Booking status to 'Paid' (Only for Booking payments)
#         if booking and payment_type == 'Booking': 
#             booking.status = 'Paid'
#             booking.save()

#         # 4. Return Checkout URL and transaction ID to the frontend
#         return Response({
#             "payment_id": payment.id,
#             "transaction_id": payment.gateway_transaction_id, # return ID for webhook simulation
#             "amount": payment.amount,
#             "checkout_url": gateway_data['checkout_url']
#         }, status=status.HTTP_201_CREATED)


# class PaymentWebhookView(APIView):
#     """
#     Handles webhook notification from the payment gateway.
#     Updates the Payment status and the associated Booking/User status upon SUCCESS.
#     """
#     permission_classes = [permissions.AllowAny] 

#     def post(self, request, *args, **kwargs):
#         event_data = request.data
#         transaction_id = event_data.get('transaction_id') 
#         new_status = event_data.get('status') 
        
#         # In a real webhook, you would also verify the signature and source IP

#         if not transaction_id or new_status not in ['succeeded', 'failed']:
#             return Response({"detail": "Invalid webhook payload."}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             payment = Payment.objects.get(gateway_transaction_id=transaction_id)
#         except Payment.DoesNotExist:
#             return Response({"detail": "Payment record not found."}, status=status.HTTP_404_NOT_FOUND)

#         # 1. Handle Succeeded Status
#         if new_status == 'succeeded' and payment.status != 'succeeded':
#             payment.status = 'succeeded'
#             payment.gateway_response = event_data
#             payment.save()
            
#             # --- CRUCIAL LOGIC: GUIDE REGISTRATION FEE SUCCESS ---
#             if payment.payment_type == 'RegistrationFee':
#                 user = payment.payer
#                 # Ensure user applied for guide role (is_local_guide) 
#                 # and then grant final approval (guide_approved).
#                 if user.is_local_guide and not user.guide_approved:
#                     user.guide_approved = True  # FINAL APPROVAL
#                     user.save()
#             # --------------------------------------------------
            
#             # 2. Update Booking Status to Paid (Only for Booking payments)
#             if payment.related_booking and payment.related_booking.status != 'Paid' and payment.payment_type == 'Booking':
#                 booking = payment.related_booking
#                 booking.status = 'Paid'
#                 booking.save()
                
#             return Response({"detail": "Payment succeeded and status updated."}, status=status.HTTP_200_OK)

#         # 3. Handle Failed Status
#         elif new_status == 'failed' and payment.status != 'failed':
#             payment.status = 'failed'
#             payment.gateway_response = event_data
#             payment.save()
            
#             # Revert Booking status to allow retry (if applicable)
#             if payment.related_booking and payment.payment_type == 'Booking':
#                 payment.related_booking.status = 'Accepted' 
#                 payment.related_booking.save()
            
#             return Response({"detail": "Payment failed. Status updated."}, status=status.HTTP_200_OK)
            
#         return Response({"detail": "Status unchanged."}, status=status.HTTP_200_OK)



# import base64
# import requests
# from decimal import Decimal
# from rest_framework import viewsets, generics, permissions, status
# from rest_framework.response import Response
# from rest_framework.views import APIView
# from rest_framework.exceptions import ValidationError

# from .models import Payment
# from .serializers import PaymentSerializer, PaymentInitiationSerializer
# from accommodation_booking.models import Booking
# from user_authentication.models import User
# import uuid


# # ==============================
# #   PAYMONGO REAL CONFIG
# # ==============================
# PAYMONGO_SECRET_KEY = "sk_test_9QoPRAMdb1Df6kQFFSbzCwTJ"
# PAYMONGO_BASE_URL = "https://api.paymongo.com/v1/links"
# PAYMONGO_RETURN_URL = "http://localhost:5173/payment-success"

# # Convert secret key to Base64 for HTTP Basic Auth Header
# ENCODED_SECRET = base64.b64encode(f"{PAYMONGO_SECRET_KEY}:".encode()).decode()


# # ==============================
# #   REAL PAYMONGO API CALL
# # ==============================
# def create_payment_link(amount, description, user):
#     """Creates a real PayMongo Payment Link."""
#     payload = {
#         "data": {
#             "attributes": {
#                 "amount": int(amount * 100),  # PayMongo is in centavos
#                 "currency": "PHP",
#                 "description": description,
#                 "remarks": "Localynk Payment",
#                 "success_redirect_url": PAYMONGO_RETURN_URL,
#                 "billing": {
#                     "name": f"{user.first_name} {user.last_name}",
#                     "email": user.email,
#                     "phone": user.phone_number,
#                 }
#             }
#         }
#     }

#     response = requests.post(
#         PAYMONGO_BASE_URL,
#         json=payload,
#         headers={
#             "Authorization": f"Basic {ENCODED_SECRET}",
#             "Content-Type": "application/json"
#         }
#     )

#     if response.status_code not in [200, 201]:
#         print("PayMongo Error:", response.text)
#         raise ValidationError({"detail": "Failed to create PayMongo payment link."})

#     return response.json()


# # ==============================
# #   Payment History ReadOnly
# # ==============================
# class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
#     serializer_class = PaymentSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         return Payment.objects.filter(payer=self.request.user).order_by('-timestamp')


# # ==============================
# #  Payment Creation (Tourist)
# # ==============================
# class PaymentInitiationView(generics.CreateAPIView):
#     serializer_class = PaymentInitiationSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     REGISTRATION_FEE_DETAILS = {
#         "base_amount": Decimal("500.00"),
#         "service_fee": Decimal("50.00")
#     }

#     def perform_create(self, serializer):
#         user = self.request.user
#         booking = getattr(serializer, "booking_instance", None)

#         payment_type = serializer.validated_data["payment_type"]
#         payment_method = serializer.validated_data["payment_method"]

#         # Determine amount
#         if payment_type == "RegistrationFee":
#             base = self.REGISTRATION_FEE_DETAILS["base_amount"]
#             service = self.REGISTRATION_FEE_DETAILS["service_fee"]
#             final_amount = base + service
#         else:
#             final_amount = serializer.validated_data["final_amount"]
#             service = Decimal("0.00")

#         if final_amount <= 0:
#             raise ValidationError({"detail": "Payment amount must be greater than zero."})

#         # Generate transaction ID for internal tracking
#         transaction_id = str(uuid.uuid4())

#         # Create REAL PayMongo Payment Link
#         description = f"{payment_type} Payment - {user.email}"
#         paymongo_res = create_payment_link(final_amount, description, user)

#         checkout_url = paymongo_res["data"]["attributes"]["checkout_url"]

#         # Save payment
#         payment = Payment.objects.create(
#             payer=user,
#             payment_type=payment_type,
#             related_booking=booking,
#             amount=final_amount,
#             service_fee=service,
#             payment_method=payment_method,
#             gateway_transaction_id=transaction_id,
#             status="pending",
#             gateway_response=paymongo_res
#         )

#         # Update Booking immediately only for booking payments
#         if booking and payment_type == "Booking":
#             booking.status = "Paid"
#             booking.save()

#         return Response({
#             "payment_id": payment.id,
#             "transaction_id": transaction_id,
#             "amount": payment.amount,
#             "checkout_url": checkout_url
#         }, status=status.HTTP_201_CREATED)


# # ==============================
# #  Webhook Handler
# # ==============================
# class PaymentWebhookView(APIView):
#     permission_classes = [permissions.AllowAny]

#     def post(self, request, *args, **kwargs):
#         event = request.data

#         transaction_id = event.get("transaction_id")
#         status_update = event.get("status")

#         if not transaction_id or status_update not in ["succeeded", "failed"]:
#             return Response({"detail": "Invalid webhook payload."}, status=400)

#         try:
#             payment = Payment.objects.get(gateway_transaction_id=transaction_id)
#         except Payment.DoesNotExist:
#             return Response({"detail": "Payment not found."}, status=404)

#         # SUCCESS
#         if status_update == "succeeded" and payment.status != "succeeded":
#             payment.status = "succeeded"
#             payment.gateway_response = event
#             payment.save()

#             # Special logic: Guide registration final approval
#             if payment.payment_type == "RegistrationFee":
#                 user = payment.payer
#                 if user.is_local_guide and not user.guide_approved:
#                     user.guide_approved = True
#                     user.save()

#             # Booking status update
#             if payment.related_booking and payment.payment_type == "Booking":
#                 booking = payment.related_booking
#                 booking.status = "Paid"
#                 booking.save()

#             return Response({"detail": "Payment succeeded."}, status=200)

#         # FAILED
#         if status_update == "failed" and payment.status != "failed":
#             payment.status = "failed"
#             payment.gateway_response = event
#             payment.save()

#             if payment.related_booking and payment.payment_type == "Booking":
#                 payment.related_booking.status = "Accepted"
#                 payment.related_booking.save()

#             return Response({"detail": "Payment failed."}, status=200)

#         return Response({"detail": "No status change."}, status=200)




# payments/views.py (Full updated file structure for copy-paste)
import uuid
from decimal import Decimal
from django.conf import settings
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView 
from rest_framework.exceptions import ValidationError
from django.apps import apps 
from rest_framework.permissions import AllowAny 

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