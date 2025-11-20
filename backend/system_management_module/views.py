from rest_framework import generics, permissions, status #type: ignore
from rest_framework.response import Response #type: ignore
from .models import GuideReviewRequest, SystemAlert
from user_authentication.models import User # Ensure User is imported
from user_authentication.models import GuideApplication # Ensure GuideApplication is imported
from .serializers import GuideApplicationSubmissionSerializer, GuideReviewUpdateSerializer, SystemAlertSerializer
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Q # Import for complex lookups
from rest_framework.views import APIView #type: ignore

# --- 1. Endpoint for User Submitting Application (Unchanged) ---

class GuideApplicationSubmissionView(generics.CreateAPIView):
    """
    Endpoint for a Tourist to initiate their Guide application process.
    This handles multipart form data (profile updates + documents).
    """
    serializer_class = GuideApplicationSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        user = request.user
        data = request.data
        files = request.FILES

        # 1. Update User Profile Fields
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.phone_number = data.get('phone_number', user.phone_number)
        user.location = data.get('address', user.location) 
        user.apply_as_guide() # Sets is_local_guide=True, guide_approved=False
        user.save()

        # 2. Handle Guide Application/Document Upload
        application, created = GuideApplication.objects.get_or_create(user=user)
        
        # Update documents if provided in the multipart request (keys must match FE: tour_guide_certificate, etc.)
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


        # 3. Create/Update Guide Review Request (Admin Action Item)
        review_request, created = GuideReviewRequest.objects.get_or_create(
            applicant=user,
            defaults={'status': 'Pending'}
        )
        if not created and review_request.status != 'Pending':
             review_request.status = 'Pending'
             review_request.reviewed_by = None
             review_request.admin_notes = None
             review_request.save()
        
        return Response({
            "detail": "Guide application and documents submitted successfully. Pending admin review.",
            "review_request_id": review_request.pk
        }, status=status.HTTP_201_CREATED)


# --- 2. Endpoint for Admin Reviewing Applications (List/Detail) ---

class GuideReviewRequestViewSet(generics.ListAPIView, generics.RetrieveUpdateAPIView):
    """
    Admin-only endpoint to list pending applications and approve/reject them.
    """
    serializer_class = GuideReviewUpdateSerializer
    permission_classes = [permissions.IsAdminUser] 

    def get_queryset(self):
        # Admins see all pending reviews, usually ordered by submission date
        return GuideReviewRequest.objects.select_related('applicant').filter(status='Pending').order_by('submission_date')
    
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Pre-save: Capture the incoming status for action later
        new_status = serializer.validated_data.get('status')
        
        # 1. Save the Guide Review Request
        serializer.save(reviewed_by=request.user)

        # 2. CRUCIAL LOGIC: Set user role eligibility (Ready to Pay, but NOT approved)
        if new_status == 'Approved':
            user = instance.applicant
            
            # The User's is_local_guide is already True from the submission step.
            # We must ensure guide_approved remains False until payment is confirmed.
            # Since the user is already set to is_local_guide=True and guide_approved=False
            # at submission, we only need to ensure these flags are maintained 
            # if they were somehow accidentally changed before this point.
            
            # This step primarily triggers the SystemAlert via the model's save method,
            # which notifies the user to pay.
            
        elif new_status == 'Rejected':
            # Revert the user role entirely if the application is rejected.
            user = instance.applicant
            user.is_local_guide = False
            user.guide_approved = False
            user.save()

        return Response(serializer.data)

# --- 3. Endpoint for Users to View/Manage Alerts (Unchanged) ---

class UserAlertListView(generics.ListAPIView):
    """
    Lists system alerts specific to the authenticated user.
    """
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        target_role = 'Guide' if user.guide_approved else 'Tourist'
        
        # Use Q objects for complex OR lookups
        return SystemAlert.objects.filter(
            Q(recipient=user) | Q(recipient=user, target_type=target_role)
        ).order_by('-created_at')

class UserAlertMarkReadView(generics.UpdateAPIView):
    """
    Allows a user to mark a specific alert as read.
    """
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'id'

    def get_queryset(self):
        # Ensure user can only update their own alerts
        return SystemAlert.objects.filter(recipient=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_read = True
        instance.save(update_fields=['is_read'])
        return Response(self.get_serializer(instance).data)

# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework.permissions import IsAuthenticated
from .models import SystemAlert

class UnreadAlertCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        # Count unread alerts specifically for this user
        count = SystemAlert.objects.filter(recipient=user, is_read=False).count()
        return Response({'unread_count': count})