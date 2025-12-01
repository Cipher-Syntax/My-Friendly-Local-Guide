# import uuid
# import os
# from decimal import Decimal
# from datetime import date, timedelta
# from django.conf import settings
# from rest_framework import generics, permissions, status, viewsets #type: ignore
# from rest_framework.response import Response #type: ignore
# from rest_framework.views import APIView #type: ignore
# from rest_framework.exceptions import ValidationError #type: ignore
# from django.shortcuts import get_object_or_404
# from django.apps import apps 
# from requests.exceptions import RequestException

# from django.utils.decorators import method_decorator
# from django.views.decorators.csrf import csrf_exempt

# from .models import Payment
# from .serializers import PaymentSerializer, PaymentInitiationSerializer

# from .paymongo import create_checkout_session, retrieve_checkout_session

# try:
#     Booking = apps.get_model('accommodation_booking', 'Booking')
# except LookupError:
#     Booking = None 

# class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
#     serializer_class = PaymentSerializer
#     permission_classes = [permissions.IsAuthenticated]

#     def get_queryset(self):
#         return Payment.objects.filter(payer=self.request.user).order_by("-timestamp")

# class PaymentInitiationView(APIView):
#     permission_classes = [permissions.IsAuthenticated]
#     SUBSCRIPTION_PRICE = Decimal("3000.00")

#     def post(self, request, *args, **kwargs):
#         serializer = PaymentInitiationSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
        
#         user = request.user
#         payment_type = serializer.validated_data.get("payment_type")
#         raw_method = serializer.validated_data.get("payment_method", "").lower()
        
#         description = ""
#         final_amount = Decimal("0.00")

#         booking_instance = None
#         if payment_type == "YearlySubscription":
#             final_amount = self.SUBSCRIPTION_PRICE
#             description = "Guide Yearly Subscription"
#         elif payment_type == "Booking":
#             booking_instance = serializer.booking_instance
#             if not booking_instance:
#                 raise ValidationError({"detail": "Booking is required."})
#             final_amount = serializer.validated_data["final_amount"]
#             description = f"Booking Payment #{booking_instance.id}"
#         else:
#             raise ValidationError({"detail": "Invalid payment type."})

#         if final_amount <= 0:
#             raise ValidationError({"detail": "Invalid payment amount."})

#         payment = Payment.objects.create(
#             payer=user,
#             payment_type=payment_type,
#             related_booking=booking_instance,
#             amount=final_amount,
#             payment_method=raw_method,
#             status="pending",
#         )

#         billing_data = {
#             "name": f"{user.first_name} {user.last_name}",
#             "email": user.email,
#             "phone": user.phone_number or ""
#         }
        
#         try:
#             paymongo_types = []
#             if 'card' in raw_method: paymongo_types = ['card']
#             elif 'maya' in raw_method: paymongo_types = ['paymaya']
#             elif 'grab' in raw_method: paymongo_types = ['grab_pay']
#             elif 'gcash' in raw_method: paymongo_types = ['gcash']
#             elif 'shopee' in raw_method: paymongo_types = ['grab_pay'] 
#             else: paymongo_types = ['gcash'] 

#             result = create_checkout_session(
#                 amount=final_amount,
#                 description=description,
#                 billing=billing_data,
#                 payment_method_types=paymongo_types
#             )
                
#             checkout_url = result['checkout_url']
#             transaction_id = result['transaction_id'] 

#             payment.gateway_transaction_id = transaction_id
#             payment.save()

#             if not checkout_url:
#                 raise ValidationError({"detail": "Failed to generate redirect URL."})

#             return Response({
#                 "checkout_url": checkout_url, 
#                 "payment_id": payment.id 
#             }, status=status.HTTP_201_CREATED)

#         except RuntimeError as e:
#             payment.status = 'failed'
#             payment.save()
#             raise ValidationError({"detail": str(e)})


# @method_decorator(csrf_exempt, name='dispatch')
# class PaymentWebhookView(APIView):
#     permission_classes = [permissions.AllowAny]

#     def post(self, request):
#         data = request.data
#         event_type = data.get("data", {}).get("attributes", {}).get("type")
#         if not event_type: event_type = data.get("type")

#         transaction_id = None
#         if 'checkout_session' in event_type:
#              transaction_id = data.get("data", {}).get("attributes", {}).get("data", {}).get("id")
#              if not transaction_id: transaction_id = data.get("data", {}).get("id")

#         if not transaction_id:
#              return Response({"detail": "Could not identify transaction ID"}, status=400)

#         try:
#             payment = Payment.objects.get(gateway_transaction_id=transaction_id)
#         except Payment.DoesNotExist:
#             return Response({"detail": "Payment not found"}, status=404)

#         if 'paid' in event_type or 'succeeded' in event_type:
#             self._handle_success(payment, data)
#         elif 'failed' in event_type:
#             payment.status = "failed"
#             payment.save()

#         return Response({"status": "Webhook processed"}, status=200)

#     def _handle_success(self, payment, data):
#         """Helper to handle success logic so we don't duplicate code"""
#         if payment.status != 'succeeded':
#             payment.status = "succeeded"
#             payment.gateway_response = data
#             payment.save()

#             if payment.related_booking:
#                 payment.related_booking.status = "Paid"
#                 payment.related_booking.save()

#             if payment.payment_type == "YearlySubscription":
#                 user = payment.payer
#                 user.guide_tier = 'paid'
#                 user.subscription_end_date = date.today() + timedelta(days=365)
#                 user.save()


# class PaymentStatusView(APIView):
#     permission_classes = [permissions.IsAuthenticated]

#     def get(self, request, payment_id):
#         payment = get_object_or_404(Payment, id=payment_id, payer=request.user)

#         if payment.status == 'pending' and payment.gateway_transaction_id:
#             pm_data = retrieve_checkout_session(payment.gateway_transaction_id)
            
#             if pm_data:
#                 attributes = pm_data.get('data', {}).get('attributes', {})
#                 checkout_status = attributes.get('payment_status')
                
#                 is_paid = (checkout_status == 'paid')
#                 if not is_paid:
#                     payments_list = attributes.get('payments', [])
#                     if payments_list and payments_list[0]['attributes']['status'] == 'paid':
#                         is_paid = True

#                 if is_paid:
#                     payment.status = "succeeded"
#                     payment.gateway_response = pm_data
#                     payment.save()

#                     if payment.related_booking:
#                         payment.related_booking.status = "Paid"
#                         payment.related_booking.save()

#                     if payment.payment_type == "YearlySubscription":
#                         user = payment.payer
#                         user.guide_tier = 'paid'
#                         user.subscription_end_date = date.today() + timedelta(days=365)
#                         user.save()

#         return Response({
#             "status": payment.status,
#             "payment_type": payment.payment_type,
#             "amount": str(payment.amount), 
#         })

# class SubscriptionPriceView(APIView):
#     permission_classes = [permissions.AllowAny]

#     def get(self, request, *args, **kwargs):
#         return Response({"price": PaymentInitiationView.SUBSCRIPTION_PRICE})

import uuid
import os
from decimal import Decimal
from datetime import date, timedelta
from django.conf import settings
from rest_framework import generics, permissions, status, viewsets #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.exceptions import ValidationError #type: ignore
from django.shortcuts import get_object_or_404
from django.apps import apps 
from requests.exceptions import RequestException

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .models import Payment
from .serializers import PaymentSerializer, PaymentInitiationSerializer

from .paymongo import create_checkout_session, retrieve_checkout_session

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
    SUBSCRIPTION_PRICE = Decimal("3000.00")

    def post(self, request, *args, **kwargs):
        serializer = PaymentInitiationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        user = request.user
        payment_type = serializer.validated_data.get("payment_type")
        raw_method = serializer.validated_data.get("payment_method", "").lower()
        
        description = ""
        final_amount = Decimal("0.00")

        booking_instance = None
        if payment_type == "YearlySubscription":
            final_amount = self.SUBSCRIPTION_PRICE
            description = "Guide Yearly Subscription"
        elif payment_type == "Booking":
            booking_instance = serializer.booking_instance
            if not booking_instance:
                raise ValidationError({"detail": "Booking is required."})
            final_amount = serializer.validated_data["final_amount"]
            description = f"Booking Payment #{booking_instance.id}"
        else:
            raise ValidationError({"detail": "Invalid payment type."})

        if final_amount <= 0:
            raise ValidationError({"detail": "Invalid payment amount."})

        payment = Payment.objects.create(
            payer=user,
            payment_type=payment_type,
            related_booking=booking_instance,
            amount=final_amount,
            payment_method=raw_method,
            status="pending",
        )

        billing_data = {
            "name": f"{user.first_name} {user.last_name}",
            "email": user.email,
            "phone": user.phone_number or ""
        }
        
        try:
            paymongo_types = []
            if 'card' in raw_method: paymongo_types = ['card']
            elif 'maya' in raw_method: paymongo_types = ['paymaya']
            elif 'grab' in raw_method: paymongo_types = ['grab_pay']
            elif 'gcash' in raw_method: paymongo_types = ['gcash']
            elif 'shopee' in raw_method: paymongo_types = ['grab_pay'] 
            else: paymongo_types = ['gcash'] 

            result = create_checkout_session(
                amount=final_amount,
                description=description,
                billing=billing_data,
                payment_method_types=paymongo_types
            )
                
            checkout_url = result['checkout_url']
            transaction_id = result['transaction_id'] 

            payment.gateway_transaction_id = transaction_id
            payment.save()

            if not checkout_url:
                raise ValidationError({"detail": "Failed to generate redirect URL."})

            return Response({
                "checkout_url": checkout_url, 
                "payment_id": payment.id 
            }, status=status.HTTP_201_CREATED)

        except RuntimeError as e:
            payment.status = 'failed'
            payment.save()
            raise ValidationError({"detail": str(e)})


@method_decorator(csrf_exempt, name='dispatch')
class PaymentWebhookView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        data = request.data
        event_type = data.get("data", {}).get("attributes", {}).get("type")
        if not event_type: event_type = data.get("type")

        transaction_id = None
        if 'checkout_session' in event_type:
             transaction_id = data.get("data", {}).get("attributes", {}).get("data", {}).get("id")
             if not transaction_id: transaction_id = data.get("data", {}).get("id")

        if not transaction_id:
             return Response({"detail": "Could not identify transaction ID"}, status=400)

        try:
            payment = Payment.objects.get(gateway_transaction_id=transaction_id)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found"}, status=404)

        if 'paid' in event_type or 'succeeded' in event_type:
            self._handle_success(payment, data)
        elif 'failed' in event_type:
            payment.status = "failed"
            payment.save()

        return Response({"status": "Webhook processed"}, status=200)

    def _handle_success(self, payment, data):
        """Helper to handle success logic so we don't duplicate code"""
        if payment.status != 'succeeded':
            payment.status = "succeeded"
            payment.gateway_response = data
            payment.save()

            if payment.related_booking:
                payment.related_booking.status = "Paid"
                payment.related_booking.save()

            if payment.payment_type == "YearlySubscription":
                user = payment.payer
                user.guide_tier = 'paid'
                user.subscription_end_date = date.today() + timedelta(days=365)
                user.save()


class PaymentStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, payment_id):
        payment = get_object_or_404(Payment, id=payment_id, payer=request.user)

        if payment.status == 'pending' and payment.gateway_transaction_id:
            pm_data = retrieve_checkout_session(payment.gateway_transaction_id)
            
            if pm_data:
                attributes = pm_data.get('data', {}).get('attributes', {})
                checkout_status = attributes.get('payment_status')
                
                is_paid = (checkout_status == 'paid')
                if not is_paid:
                    payments_list = attributes.get('payments', [])
                    if payments_list and payments_list[0]['attributes']['status'] == 'paid':
                        is_paid = True

                if is_paid:
                    payment.status = "succeeded"
                    payment.gateway_response = pm_data
                    payment.save()

                    if payment.related_booking:
                        payment.related_booking.status = "Paid"
                        payment.related_booking.save()

                    if payment.payment_type == "YearlySubscription":
                        user = payment.payer
                        user.guide_tier = 'paid'
                        user.subscription_end_date = date.today() + timedelta(days=365)
                        user.save()

        return Response({
            "status": payment.status,
            "payment_type": payment.payment_type,
            "amount": str(payment.amount), 
        })

class SubscriptionPriceView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        # Return price AND limits for the frontend to consume
        return Response({
            "price": PaymentInitiationView.SUBSCRIPTION_PRICE,
            "guide_limit": 2, # Limit for free tier
            "booking_limit": 1 # Limit for free tier
        })