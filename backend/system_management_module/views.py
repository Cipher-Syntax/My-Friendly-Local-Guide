from rest_framework import generics, permissions, status, viewsets #type: ignore
from rest_framework.response import Response #type: ignore
from django.db import transaction #type: ignore
from django.db.models import Count, DecimalField, Q, Sum, Value #type: ignore
from django.db.models.functions import Coalesce #type: ignore
from rest_framework.views import APIView #type: ignore
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError #type: ignore
from .services.email_preferences import send_preference_aware_email

from .models import GuideReviewRequest, SystemAlert
from .models import PushDeviceToken
from user_authentication.models import GuideApplication
from agency_management_module.models import Agency
from accommodation_booking.models import Booking
from destinations_and_attractions.models import Destination
from .serializers import (
    GuideApplicationSubmissionSerializer, 
    AdminGuideReviewSerializer,
    SystemAlertSerializer,
    CreateSystemAlertSerializer,
    PushTokenRegisterSerializer,
    PushTokenUnregisterSerializer,
)
from user_authentication.phone_utils import normalize_ph_phone
from backend.pagination import OptionalPageNumberPagination

User = get_user_model()

class GuideApplicationSubmissionView(generics.CreateAPIView):
    serializer_class = GuideApplicationSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        user = request.user
        data = request.data
        files = request.FILES

        normalized_phone = data.get('phone_number', user.phone_number)
        if normalized_phone:
            try:
                normalized_phone = normalize_ph_phone(normalized_phone, 'phone_number')
            except ValidationError as exc:
                return Response(exc.detail, status=status.HTTP_400_BAD_REQUEST)

        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.phone_number = normalized_phone
        user.location = data.get('address', user.location) 
        user.apply_as_guide() 
        user.save()

        application, created = GuideApplication.objects.get_or_create(user=user)
        
        if 'tour_guide_certificate' in files:
            application.tour_guide_certificate = files['tour_guide_certificate']
        if 'proof_of_residency' in files:
            application.proof_of_residency = files['proof_of_residency']
        if 'valid_id' in files:
            application.valid_id = files['valid_id']
        if 'nbi_clearance' in files:
            application.nbi_clearance = files['nbi_clearance']
            
        application.is_reviewed = False 
        application.review_notes = "Application submitted, pending admin review."
        application.save()

        review_request, created = GuideReviewRequest.objects.get_or_create(
            applicant=user,
            defaults={'status': 'Pending'}
        )
        if not created and review_request.status != 'Pending':
             review_request.status = 'Pending'
             review_request.reviewed_by = None
             review_request.save()
        
        try:
            admin_emails = list(User.objects.filter(is_superuser=True).values_list('email', flat=True))
            if admin_emails:
                plain_message = f"User {user.username} has submitted an application to be a guide.\nPlease review in dashboard."
                html_message = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }}
                        .header {{ background-color: #0072FF; padding: 20px; text-align: center; color: #ffffff; font-size: 20px; font-weight: bold; }}
                        .content {{ padding: 30px; line-height: 1.6; font-size: 16px; color: #475569; }}
                        .highlight {{ font-weight: bold; color: #333; }}
                        .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">System Administrator Alert</div>
                        <div class="content">
                            <p>A user has just completed their profile to become an independent Local Guide.</p>
                            <ul>
                                <li><span class="highlight">Username:</span> {user.username}</li>
                                <li><span class="highlight">Full Name:</span> {user.first_name} {user.last_name}</li>
                                <li><span class="highlight">Status:</span> Pending Review</li>
                            </ul>
                            <p>Please log in to the admin dashboard to review their uploaded documents.</p>
                        </div>
                        <div class="footer">&copy; 2026 LocaLynk Internal System.</div>
                    </div>
                </body>
                </html>
                """

                send_preference_aware_email(
                    subject="New Guide Application - Action Required",
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=admin_emails,
                    fail_silently=True,
                    html_message=html_message
                )
        except Exception as e:
            print(f"Error sending admin email: {e}")
        
        SystemAlert.objects.create(
            target_type='Admin',
            title="New Guide Application",
            message=f"New application submitted by {user.username}. Review required.",
            related_model='GuideReviewRequest',
            related_object_id=review_request.pk
        )

        return Response({
            "detail": "Guide application submitted successfully.",
            "review_request_id": review_request.pk
        }, status=status.HTTP_201_CREATED)


class GuideReviewRequestViewSet(viewsets.ModelViewSet):
    serializer_class = AdminGuideReviewSerializer
    permission_classes = [permissions.IsAdminUser] 
    http_method_names = ['get', 'patch', 'head', 'options']

    def get_queryset(self):
        return GuideReviewRequest.objects.select_related('applicant', 'applicant__guide_application').all().order_by('submission_date')
    
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        print("--- ADMIN APPROVAL UPDATE METHOD CALLED ---")
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        
        serializer.save(reviewed_by=request.user)

        if new_status == 'Approved':
            user_to_approve = instance.applicant
            user_to_approve.guide_approved = True
            user_to_approve.save(update_fields=['guide_approved'])
            
        elif new_status == 'Rejected':
            user_to_reject = instance.applicant
            user_to_reject.is_local_guide = False
            user_to_reject.guide_approved = False
            user_to_reject.save(update_fields=['is_local_guide', 'guide_approved'])

        return Response(serializer.data)


class UserAlertListView(generics.ListAPIView):
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        user = self.request.user
        target_role = 'Guide' if getattr(user, 'is_local_guide', False) else 'Tourist'
        return SystemAlert.objects.filter(
            Q(recipient=user) | 
            Q(target_type=target_role, recipient__isnull=True)
        ).order_by('-created_at')

class UserAlertMarkReadView(generics.UpdateAPIView):
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        return SystemAlert.objects.filter(recipient=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_read = True
        instance.save(update_fields=['is_read'])
        return Response(self.get_serializer(instance).data)


class UserAlertMarkAllReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        updated = SystemAlert.objects.filter(
            recipient=request.user,
            is_read=False,
        ).update(is_read=True)
        return Response({'detail': 'All notifications marked as read.', 'updated': updated}, status=status.HTTP_200_OK)


class UserAlertDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = SystemAlertSerializer
    lookup_field = 'id'

    def get_queryset(self):
        return SystemAlert.objects.filter(recipient=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserAlertDeleteAllView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request):
        deleted_count, _ = SystemAlert.objects.filter(recipient=request.user).delete()
        return Response({'detail': 'All notifications deleted.', 'deleted': deleted_count}, status=status.HTTP_200_OK)

class UnreadAlertCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        count = SystemAlert.objects.filter(recipient=user, is_read=False).count()
        return Response({'unread_count': count})

class CreateSystemAlertView(generics.CreateAPIView):
    serializer_class = CreateSystemAlertSerializer
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class PushTokenRegisterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not getattr(request.user, 'push_enabled', True):
            PushDeviceToken.objects.filter(user=request.user, is_active=True).update(is_active=False)
            return Response({
                'detail': 'Push notifications are disabled for this user. Token registration skipped.',
            }, status=status.HTTP_200_OK)

        serializer = PushTokenRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['expo_push_token']
        device_id = serializer.validated_data.get('device_id')
        platform = serializer.validated_data.get('platform', 'unknown')
        app_version = serializer.validated_data.get('app_version')

        device, _ = PushDeviceToken.objects.update_or_create(
            expo_push_token=token,
            defaults={
                'user': request.user,
                'device_id': device_id,
                'platform': platform,
                'app_version': app_version,
                'is_active': True,
            }
        )

        return Response({
            'detail': 'Push token registered successfully.',
            'id': device.id,
        }, status=status.HTTP_200_OK)


class PushTokenUnregisterView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = PushTokenUnregisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data['expo_push_token']
        updated = PushDeviceToken.objects.filter(
            user=request.user,
            expo_push_token=token,
            is_active=True,
        ).update(is_active=False)

        if not updated:
            return Response({'detail': 'Token not found or already inactive.'}, status=status.HTTP_404_NOT_FOUND)

        return Response({'detail': 'Push token deactivated.'}, status=status.HTTP_200_OK)

class AdminDashboardSummaryView(APIView):
    # permission_classes = [permissions.IsAdminUser] 

    def get(self, request):
        # 1. Users & Partners
        total_tourists = User.objects.filter(is_tourist=True, is_staff=False).count()
        total_guides = User.objects.filter(is_local_guide=True, is_staff=False).count()
        pending_guides = GuideReviewRequest.objects.filter(status='Pending').count()
        
        total_agencies = Agency.objects.count()
        # NEW FIXED CODE
        pending_agencies = Agency.objects.filter(status='Pending').count()

        total_users = total_tourists + total_guides + total_agencies

        # 2. Content
        total_destinations = Destination.objects.count()

        # 3. Bookings
        all_bookings = Booking.objects.all()
        total_bookings = all_bookings.count()
        active_bookings = all_bookings.filter(status__in=['Pending_Payment', 'Confirmed', 'Accepted']).count()
        
        # Get recent bookings for dashboard table pagination
        recent_bookings = list(all_bookings.order_by('-created_at')[:25].values(
            'id',
            'status',
            'total_price',
            'created_at',
            'tourist__username',
            'tourist__first_name',
            'tourist__last_name',
        ))

        # 4. Financials (Total Platform Earnings from settled payouts)
        platform_revenue = all_bookings.filter(is_payout_settled=True).aggregate(
            total=Sum('platform_fee')
        )['total'] or 0.0

        return Response({
            'users': {
                'total_users': total_users,
                'tourists': total_tourists,
                'guides': total_guides,
                'agencies': total_agencies,
                'pending_guides': pending_guides,
                'pending_agencies': pending_agencies,
                'total_pending': pending_guides + pending_agencies,
            },
            'content': {
                'destinations': total_destinations,
            },
            'bookings': {
                'total': total_bookings,
                'active': active_bookings,
                'recent': recent_bookings,
            },
            'finance': {
                'platform_revenue': float(platform_revenue)
            },
            'system': {
                'health': 100, 
            }
        })


def _resolve_timeframe_window(raw_timeframe):
    normalized = str(raw_timeframe or 'Monthly').strip().lower()
    now = timezone.localtime(timezone.now())

    if normalized == 'daily':
        return 'Daily', now.replace(hour=0, minute=0, second=0, microsecond=0), now

    if normalized == 'weekly':
        start_of_week = now - timedelta(days=now.weekday())
        return 'Weekly', start_of_week.replace(hour=0, minute=0, second=0, microsecond=0), now

    if normalized == 'monthly':
        return 'Monthly', now.replace(day=1, hour=0, minute=0, second=0, microsecond=0), now

    if normalized == 'yearly':
        return 'Yearly', now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0), now

    raise ValidationError({'timeframe': 'Invalid timeframe. Use Daily, Weekly, Monthly, or Yearly.'})


def _parse_ranking_limit(raw_limit):
    if raw_limit is None:
        return 5

    try:
        parsed = int(raw_limit)
    except (TypeError, ValueError):
        raise ValidationError({'limit': 'Limit must be a whole number between 1 and 20.'})

    if parsed < 1 or parsed > 20:
        raise ValidationError({'limit': 'Limit must be between 1 and 20.'})

    return parsed


class AdminPartnerRankingsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def _serialize_guide_entry(self, guide):
        full_name = f"{guide.first_name} {guide.last_name}".strip()

        return {
            'id': guide.id,
            'username': guide.username,
            'display_name': full_name or guide.username or f'Guide #{guide.id}',
            'bookings_count': int(getattr(guide, 'bookings_count', 0) or 0),
            'earnings': float(getattr(guide, 'earnings', 0) or 0),
            'rating': float(guide.guide_rating or 0),
        }

    def _serialize_agency_entry(self, agency):
        username = agency.user.username if agency.user_id and agency.user else ''
        display_name = agency.business_name or agency.owner_name or username or f'Agency #{agency.id}'

        return {
            'id': agency.id,
            'user_id': agency.user_id,
            'username': username,
            'display_name': display_name,
            'bookings_count': int(getattr(agency, 'bookings_count', 0) or 0),
            'earnings': float(getattr(agency, 'earnings', 0) or 0),
            'status': agency.status,
        }

    def get(self, request):
        timeframe_label, window_start, window_end = _resolve_timeframe_window(
            request.query_params.get('timeframe', 'Monthly')
        )
        limit = _parse_ranking_limit(request.query_params.get('limit'))

        ranking_statuses = ['Accepted', 'Confirmed', 'Completed']

        guide_booking_filter = (
            Q(guide_tours_booked__status__in=ranking_statuses)
            & Q(guide_tours_booked__created_at__gte=window_start)
            & Q(guide_tours_booked__created_at__lte=window_end)
        )

        agency_booking_filter = (
            Q(user__agency_bookings__status__in=ranking_statuses)
            & Q(user__agency_bookings__created_at__gte=window_start)
            & Q(user__agency_bookings__created_at__lte=window_end)
        )

        guide_stats = User.objects.filter(
            is_local_guide=True,
            is_staff=False,
        ).annotate(
            bookings_count=Count('guide_tours_booked', filter=guide_booking_filter, distinct=True),
            earnings=Coalesce(
                Sum('guide_tours_booked__guide_payout_amount', filter=guide_booking_filter),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )

        agency_stats = Agency.objects.select_related('user').annotate(
            bookings_count=Count('user__agency_bookings', filter=agency_booking_filter, distinct=True),
            earnings=Coalesce(
                Sum('user__agency_bookings__guide_payout_amount', filter=agency_booking_filter),
                Value(0),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            ),
        )

        response_payload = {
            'timeframe': timeframe_label,
            'window_start': window_start.isoformat(),
            'window_end': window_end.isoformat(),
            'limit': limit,
            'top_guides_by_bookings': [
                self._serialize_guide_entry(guide)
                for guide in guide_stats.order_by('-bookings_count', '-earnings', 'username', 'id')[:limit]
            ],
            'least_guides_by_bookings': [
                self._serialize_guide_entry(guide)
                for guide in guide_stats.order_by('bookings_count', 'earnings', 'username', 'id')[:limit]
            ],
            'top_guides_by_earnings': [
                self._serialize_guide_entry(guide)
                for guide in guide_stats.order_by('-earnings', '-bookings_count', 'username', 'id')[:limit]
            ],
            'least_guides_by_earnings': [
                self._serialize_guide_entry(guide)
                for guide in guide_stats.order_by('earnings', 'bookings_count', 'username', 'id')[:limit]
            ],
            'top_agencies_by_bookings': [
                self._serialize_agency_entry(agency)
                for agency in agency_stats.order_by('-bookings_count', '-earnings', 'business_name', 'id')[:limit]
            ],
            'least_agencies_by_bookings': [
                self._serialize_agency_entry(agency)
                for agency in agency_stats.order_by('bookings_count', 'earnings', 'business_name', 'id')[:limit]
            ],
            'top_agencies_by_earnings': [
                self._serialize_agency_entry(agency)
                for agency in agency_stats.order_by('-earnings', '-bookings_count', 'business_name', 'id')[:limit]
            ],
            'least_agencies_by_earnings': [
                self._serialize_agency_entry(agency)
                for agency in agency_stats.order_by('earnings', 'bookings_count', 'business_name', 'id')[:limit]
            ],
        }

        return Response(response_payload)