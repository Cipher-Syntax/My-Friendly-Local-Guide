import uuid
import os
import json
from decimal import Decimal
from datetime import date, timedelta
from django.conf import settings
from rest_framework import generics, permissions, status, viewsets 
from rest_framework.response import Response 
from rest_framework.views import APIView 
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.core.exceptions import ValidationError as ModelValidationError #type: ignore
from django.shortcuts import get_object_or_404
from django.apps import apps 
from requests.exceptions import RequestException #type: ignore
from django.core.mail import send_mail #type: ignore

from django.utils.decorators import method_decorator #type: ignore
from django.views.decorators.csrf import csrf_exempt #type: ignore

from .models import Payment
from .serializers import PaymentSerializer, PaymentInitiationSerializer
from system_management_module.models import SystemAlert

from .paymongo import create_checkout_session, retrieve_checkout_session

try:
    Booking = apps.get_model('accommodation_booking', 'Booking')
except LookupError:
    Booking = None 

try:
    TourPackage = apps.get_model('destinations_and_attractions', 'TourPackage')
except LookupError:
    TourPackage = None


def get_booking_display_days(booking):
    package = getattr(booking, 'tour_package', None)
    if package and getattr(package, 'duration_days', None):
        try:
            return max(int(package.duration_days), 1)
        except (TypeError, ValueError):
            pass

    if not booking.check_in or not booking.check_out:
        return 1

    delta_days = (booking.check_out - booking.check_in).days
    return 1 if delta_days <= 1 else max(delta_days, 1)


def format_booking_date_display(check_in, check_out, duration_days=1):
    if not check_in:
        return "N/A"

    if duration_days <= 1:
        return str(check_in)

    computed_end = check_in + timedelta(days=max(duration_days - 1, 1))
    end_for_display = computed_end

    if check_out and check_out > computed_end:
        end_for_display = check_out

    return f"{check_in} to {end_for_display}"


def resolve_receipt_tour_package(booking, trip_days):
    if getattr(booking, 'tour_package', None):
        return booking.tour_package

    if not TourPackage or not booking.guide or not booking.destination:
        return None

    candidates = TourPackage.objects.filter(
        guide=booking.guide,
        main_destination=booking.destination,
        is_active=True,
        duration_days__in=[trip_days, max(trip_days - 1, 1)],
    ).order_by('-created_at', '-id')

    return candidates.first() if candidates.count() == 1 else None


def build_itinerary_sections(booking, trip_days):
    selected_package = resolve_receipt_tour_package(booking, trip_days)
    if not selected_package:
        return "", ""

    timeline = selected_package.itinerary_timeline
    if isinstance(timeline, str):
        try:
            timeline = json.loads(timeline)
        except json.JSONDecodeError:
            timeline = []

    if not isinstance(timeline, list) or not timeline:
        return "", ""

    grouped = {}
    for item in timeline:
        if not isinstance(item, dict):
            continue
        try:
            day_num = int(item.get('day', 1))
        except (TypeError, ValueError):
            day_num = 1
        if day_num > trip_days:
            continue
        grouped.setdefault(day_num, []).append(item)

    if not grouped:
        return "", ""

    html = """
    <div class="summary-box" style="border-top: 1px dashed #cbd5e1; border-bottom: none; margin-top: 20px; margin-bottom: 10px; padding-top: 20px;">
        <div class="summary-title">Tour Itinerary</div>
    """
    plain = "\nTour Itinerary:\n"

    for day in sorted(grouped.keys()):
        html += f"<p style='margin: 8px 0 4px 0; color: #1D4ED8; font-weight: 700;'>Day {day}</p>"
        plain += f"Day {day}:\n"

        for stop in grouped[day]:
            activity = stop.get('activityName') or stop.get('name') or 'Activity Stop'
            start = stop.get('startTime')
            end = stop.get('endTime')
            time_text = f" ({start}{(' - ' + end) if end else ''})" if start else ""

            html += f"<p style='margin: 2px 0 2px 12px; color: #475569;'>- <strong>{activity}</strong>{time_text}</p>"
            plain += f"  - {activity}{time_text}\n"

    html += "</div>"
    return html, plain

class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Payment.objects.filter(payer=self.request.user).order_by("-timestamp")

class PaymentInitiationView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    SUBSCRIPTION_PRICE = Decimal("3000")

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

                        trip_days = get_booking_display_days(booking)
                        booking_date_display = format_booking_date_display(booking.check_in, booking.check_out, trip_days)
                        itinerary_html, itinerary_plain = build_itinerary_sections(booking, trip_days)

                        plain_content = (
                            f"Booking Confirmed!\n"
                            f"Dates: {booking_date_display}\n"
                            f"Provider: {provider_name}\n"
                            f"Destination: {booking.destination or 'N/A'}\n"
                            f"Transaction ID: {payment.gateway_transaction_id}\n"
                            f"{itinerary_plain}"
                        )
                        
                        html_content = f"""
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <style>
                                body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; color: #333; }}
                                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }}
                                .header {{ background-color: #0072FF; padding: 30px 20px; text-align: center; color: #ffffff; font-size: 24px; font-weight: bold; }}
                                .content {{ padding: 30px; line-height: 1.6; font-size: 16px; color: #475569; }}
                                .summary-box {{ border-bottom: 1px dashed #cbd5e1; padding-bottom: 20px; margin-bottom: 20px; }}
                                .summary-title {{ font-size: 12px; font-weight: bold; color: #94a3b8; text-transform: uppercase; margin-bottom: 10px; }}
                                .table-row {{ padding: 6px 0; }}
                                .highlight-blue {{ color: #0072FF; font-weight: bold; }}
                                .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
                                .tx-box {{ background: #f1f5f9; padding: 15px; border-radius: 8px; text-align: center; font-size: 12px; color: #64748b; margin-top: 30px; border: 1px solid #e2e8f0; }}
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">LocaLynk Booking Receipt</div>
                                <div class="content">
                                    <h2 style="color: #333; margin-top: 0; text-align: center;">Booking Confirmed!</h2>
                                    <p style="text-align: center; font-size: 14px; color: #94a3b8; margin-top: -10px;">{date.today().strftime('%B %d, %Y')}</p>

                                    <div class="summary-box">
                                        <div class="summary-title">Itinerary Details</div>
                                        <p style="margin: 5px 0;"><strong>Dates:</strong> {booking_date_display}</p>
                                        <p style="margin: 5px 0;"><strong>Provider:</strong> {provider_name}</p>
                                        <p style="margin: 5px 0;"><strong>Destination:</strong> {booking.destination or 'N/A'}</p>
                                    </div>

                                    {itinerary_html}

                                    <div>
                                        <div class="summary-title">Payment Breakdown</div>
                                        <table width="100%" cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td class="table-row" align="left">Total Trip Cost:</td>
                                                <td class="table-row" align="right">&#8369; {booking.total_price:,.2f}</td>
                                            </tr>
                                            <tr>
                                                <td class="table-row highlight-blue" align="left">Down Payment Paid (30%):</td>
                                                <td class="table-row highlight-blue" align="right">&#8369; {booking.down_payment:,.2f}</td>
                                            </tr>
                                            <tr>
                                                <td class="table-row" align="left" style="color: #64748b; font-weight: bold;">Balance (Pay to Provider):</td>
                                                <td class="table-row" align="right" style="color: #64748b; font-weight: bold;">&#8369; {booking.balance_due:,.2f}</td>
                                            </tr>
                                        </table>
                                    </div>

                                    <div class="tx-box">
                                        <strong>Transaction ID:</strong><br/>
                                        <span style="font-family: monospace;">{payment.gateway_transaction_id}</span>
                                    </div>
                                </div>
                                <div class="footer">&copy; 2026 LocaLynk. All rights reserved.</div>
                            </div>
                        </body>
                        </html>
                        """
                        send_mail(subject, plain_content, settings.DEFAULT_FROM_EMAIL, [payment.payer.email], html_message=html_content)
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
                            provider_itinerary_display = format_booking_date_display(
                                booking.check_in,
                                booking.check_out,
                                get_booking_display_days(booking)
                            )

                            p_plain_message = (
                                f"Hi {provider.username},\n\n"
                                f"A new booking has been confirmed by {tourist_name}.\n\n"
                                f"Itinerary: {provider_itinerary_display}\n"
                                f"Your Pending Payout (from down payment): ₱{net_payout:,.2f}\n\n"
                                f"The tourist will pay the remaining balance of ₱{booking.balance_due:,.2f} directly to you. Please check your dashboard for details."
                            )
                            p_html_message = f"""
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <style>
                                    body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; color: #333; }}
                                    .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }}
                                    .header {{ background-color: #10b981; padding: 30px 20px; text-align: center; color: #ffffff; font-size: 24px; font-weight: bold; }}
                                    .content {{ padding: 30px; line-height: 1.6; font-size: 16px; color: #475569; }}
                                    .highlight {{ font-weight: bold; color: #333; }}
                                    .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
                                    .btn {{ display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; text-align: center; }}
                                    .details-box {{ background: #f1f5f9; padding: 20px 20px 20px 40px; border-radius: 8px; margin: 20px 0; }}
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">New Confirmed Booking!</div>
                                    <div class="content">
                                        <p>Hi {provider.username},</p>
                                        <p>Great news! A new booking has just been confirmed by <span class="highlight">{tourist_name}</span>.</p>
                                        
                                        <ul class="details-box">
                                            <li><span class="highlight">Itinerary:</span> {provider_itinerary_display}</li>
                                            <li><span class="highlight">Your Pending Payout:</span> &#8369; {net_payout:,.2f} <span style="font-size: 12px; color: #64748b;">(From down payment)</span></li>
                                            <li><span class="highlight">Balance Due:</span> &#8369; {booking.balance_due:,.2f} <span style="font-size: 12px; color: #64748b;">(To be paid directly to you)</span></li>
                                        </ul>

                                        <p>Please log in to your dashboard to view the full details and communicate with the tourist.</p>
                                        <div style="text-align: center;">
                                            <a href="{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/login" class="btn">View Booking Dashboard</a>
                                        </div>
                                    </div>
                                    <div class="footer">&copy; 2026 LocaLynk Partner Network.</div>
                                </div>
                            </body>
                            </html>
                            """
                            send_mail(
                                p_subject, 
                                p_plain_message, 
                                settings.DEFAULT_FROM_EMAIL, 
                                [provider.email],
                                html_message=p_html_message
                            )
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