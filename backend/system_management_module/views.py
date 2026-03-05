from rest_framework import generics, permissions, status, viewsets #type: ignore
from rest_framework.response import Response #type: ignore
from django.db import transaction #type: ignore
from django.db.models import Q, Sum
from rest_framework.views import APIView #type: ignore
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import GuideReviewRequest, SystemAlert
from user_authentication.models import GuideApplication
from agency_management_module.models import Agency
from accommodation_booking.models import Booking
from destinations_and_attractions.models import Destination
from .serializers import (
    GuideApplicationSubmissionSerializer, 
    AdminGuideReviewSerializer,
    SystemAlertSerializer,
    CreateSystemAlertSerializer
)

User = get_user_model()

class GuideApplicationSubmissionView(generics.CreateAPIView):
    serializer_class = GuideApplicationSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        user = request.user
        data = request.data
        files = request.FILES

        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.phone_number = data.get('phone_number', user.phone_number)
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
                send_mail(
                    subject="New Guide Application",
                    message=f"User {user.username} has submitted an application to be a guide.\nPlease review in dashboard.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=admin_emails,
                    fail_silently=True
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

class AdminDashboardSummaryView(APIView):
    # permission_classes = [permissions.IsAdminUser] 

    def get(self, request):
        # 1. Users & Partners
        total_tourists = User.objects.filter(is_tourist=True, is_staff=False).count()
        total_guides = User.objects.filter(is_local_guide=True, is_staff=False).count()
        pending_guides = User.objects.filter(is_local_guide=True, guide_approved=False).count()
        
        total_agencies = Agency.objects.count()
        pending_agencies = Agency.objects.filter(is_approved=False).count()

        total_users = total_tourists + total_guides + total_agencies

        # 2. Content
        total_destinations = Destination.objects.count()

        # 3. Bookings
        all_bookings = Booking.objects.all()
        total_bookings = all_bookings.count()
        active_bookings = all_bookings.filter(status__in=['Pending_Payment', 'Confirmed', 'Accepted']).count()
        
        # Get the 5 most recent bookings
        recent_bookings = list(all_bookings.order_by('-created_at')[:5].values(
            'id', 'status', 'total_price', 'created_at', 'tourist__username'
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