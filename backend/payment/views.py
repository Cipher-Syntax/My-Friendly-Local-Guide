import uuid
import os
from decimal import Decimal
from datetime import date, timedelta
from django.conf import settings
from rest_framework import generics, permissions, status, viewsets 
from rest_framework.response import Response 
from rest_framework.views import APIView 
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.core.exceptions import ValidationError as ModelValidationError
from django.shortcuts import get_object_or_404
from django.apps import apps 
from requests.exceptions import RequestException #type: ignore
from django.core.mail import send_mail 

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .models import Payment
from .serializers import PaymentSerializer, PaymentInitiationSerializer
from system_management_module.models import SystemAlert

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
    SUBSCRIPTION_PRICE = Decimal("1.00")

    def post(self, request, *args, **kwargs):
        serializer = PaymentInitiationSerializer(data=request.data)
        if not serializer.is_valid():
             raise DRFValidationError(serializer.errors)
        
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
                raise DRFValidationError({"detail": "Booking is required."})
            final_amount = serializer.validated_data["final_amount"]
            description = f"Booking Payment #{booking_instance.id}"
        else:
            raise DRFValidationError({"detail": "Invalid payment type."})

        if final_amount <= 0:
            raise DRFValidationError({"detail": "Invalid payment amount."})

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
            
            if 'card' in raw_method: 
                paymongo_types = ['card']
            else:
                paymongo_types = ['gcash']

            print(f"DEBUG: Payment Method Requested: '{raw_method}' -> Mapped to PayMongo Type: {paymongo_types}")

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
                raise DRFValidationError({"detail": "Failed to generate redirect URL."})

            return Response({
                "checkout_url": checkout_url, 
                "payment_id": payment.id 
            }, status=status.HTTP_201_CREATED)

        except RuntimeError as e:
            print(f"!!! PAYMONGO API ERROR: {str(e)}")
            payment.status = 'failed'
            payment.save()
            raise DRFValidationError({"detail": str(e)})


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
        if payment.status != 'succeeded':
            payment.status = "succeeded"
            payment.gateway_response = data
            payment.save()

            if payment.related_booking:
                booking = payment.related_booking
                
                try:
                    booking.status = "Confirmed"
                    
                    commission_rate = Decimal("0.02")
                    platform_fee = (booking.total_price * commission_rate).quantize(Decimal("0.01"))
                    
                    net_payout = (booking.down_payment - platform_fee).quantize(Decimal("0.01"))
                    
                    booking.platform_fee = platform_fee
                    booking.guide_payout_amount = net_payout
                    booking.is_payout_settled = False
                    
                    booking.save() 
                    
                    if booking.guide:
                        booking.guide.booking_count += 1
                        booking.guide.save()

                    try:
                        provider_name = "Local Service"
                        if booking.guide:
                            provider_name = f"Guide: {booking.guide.get_full_name() or booking.guide.username}"
                        elif booking.agency:
                            provider_name = f"Agency: {booking.agency.username}"

                        subject = f"Your Booking Receipt - #{booking.id}"
                        
                        html_content = f"""
                        <html>
                        <body style="font-family: 'Helvetica', Arial, sans-serif; color: #1E293B; background-color: #F8FAFC; padding: 20px;">
                            <div style="max-width: 500px; margin: auto; background: white; border-radius: 20px; padding: 30px; border: 1px solid #E2E8F0;">
                                <div style="text-align: center; margin-bottom: 20px;">
                                    <h2 style="color: #0072FF; margin: 0; letter-spacing: 1px;">BOOKING SUMMARY</h2>
                                    <p style="font-size: 12px; color: #94A3B8;">{date.today().strftime('%B %d, %Y')}</p>
                                </div>
                                
                                <div style="margin-bottom: 20px; border-bottom: 1px dashed #CBD5E1; padding-bottom: 20px;">
                                    <p style="font-size: 10px; font-weight: bold; color: #94A3B8; margin-bottom: 10px; text-transform: uppercase;">Itinerary</p>
                                    <p style="margin: 5px 0;"><strong>Dates:</strong> {booking.check_in} — {booking.check_out}</p>
                                    <p style="margin: 5px 0;"><strong>Provider:</strong> {provider_name}</p>
                                    <p style="margin: 5px 0;"><strong>Destination:</strong> {booking.destination or 'N/A'}</p>
                                </div>

                                <div style="margin-bottom: 20px;">
                                    <p style="font-size: 10px; font-weight: bold; color: #94A3B8; margin-bottom: 10px; text-transform: uppercase;">Payment Breakdown</p>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                        <span>Total Trip Cost:</span> <span style="float: right;">₱ {booking.total_price:,.2f}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #0072FF; font-weight: bold;">
                                        <span>Down Payment Paid (30%):</span> <span style="float: right;">₱ {booking.down_payment:,.2f}</span>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px; color: #64748B;">
                                        <span>Balance (Pay to Provider):</span> <span style="float: right;">₱ {booking.balance_due:,.2f}</span>
                                    </div>
                                </div>

                                <div style="background: #F1F5F9; padding: 15px; border-radius: 10px; text-align: center;">
                                    <p style="font-size: 11px; color: #64748B; margin: 0;">Transaction ID: {payment.gateway_transaction_id}</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """
                        send_mail(subject, "", settings.DEFAULT_FROM_EMAIL, [payment.payer.email], html_message=html_content)
                    except Exception as e:
                        print(f"Error sending HTML receipt: {e}")

                    provider = booking.guide or booking.agency or (booking.accommodation.host if booking.accommodation else None)
                    if provider:
                        tourist_name = f"{booking.tourist.first_name} {booking.tourist.last_name}"
                        SystemAlert.objects.create(
                            target_type='Guide',
                            recipient=provider,
                            title="New Confirmed Booking",
                            message=f"New trip confirmed! {tourist_name} booked for {booking.check_in}. Payout pending: ₱{net_payout}.",
                            related_object_id=booking.id,
                            related_model='Booking',
                            is_read=False
                        )
                        
                        try:
                            p_subject = "Action Required: New Confirmed Booking"
                            p_message = (
                                f"Hi {provider.username},\n\n"
                                f"A new booking has been confirmed by {tourist_name}.\n\n"
                                f"Itinerary: {booking.check_in} to {booking.check_out}\n"
                                f"Your Pending Payout (from down payment): ₱{net_payout:,.2f}\n\n"
                                f"The tourist will pay the remaining balance of ₱{booking.balance_due:,.2f} directly to you. Please check your dashboard for details."
                            )
                            send_mail(p_subject, p_message, settings.DEFAULT_FROM_EMAIL, [provider.email])
                        except Exception as e:
                            print(f"Error notifying provider: {e}")

                except ModelValidationError as e:
                    print(f"CRITICAL: Booking Save Failed for Payment {payment.id}. Error: {e}")
                    payment.status = "refund_required" 
                    payment.save()
                    booking.status = "Cancelled"
                    booking.save(update_fields=['status']) 

                    SystemAlert.objects.create(
                        target_type='Tourist',
                        recipient=booking.tourist,
                        title="Booking Failed - Refund Initiated",
                        message=f"We are sorry! The dates were booked by another user while you were paying. Your payment of {payment.amount} will be refunded shortly.",
                        related_object_id=booking.id,
                        related_model='Booking',
                        is_read=False
                    )

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
                    PaymentWebhookView()._handle_success(payment, pm_data)

        return Response({
            "status": payment.status,
            "payment_type": payment.payment_type,
            "amount": str(payment.amount), 
        })

class SubscriptionPriceView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, *args, **kwargs):
        return Response({
            "price": PaymentInitiationView.SUBSCRIPTION_PRICE,
            "guide_limit": 2, 
            "booking_limit": 1 
        })