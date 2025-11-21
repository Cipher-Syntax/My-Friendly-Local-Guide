from rest_framework import generics, permissions, status, viewsets #type: ignore
from rest_framework.response import Response #type: ignore
from django.db import transaction
from django.db.models import Q
from rest_framework.views import APIView #type: ignore

from .models import GuideReviewRequest, SystemAlert
from user_authentication.models import GuideApplication
# Import the new serializer
from .serializers import (
    GuideApplicationSubmissionSerializer, 
    AdminGuideReviewSerializer,  # <--- Use this one
    SystemAlertSerializer
)

# --- 1. User Submission View (Unchanged) ---
class GuideApplicationSubmissionView(generics.CreateAPIView):
    serializer_class = GuideApplicationSubmissionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @transaction.atomic
    def post(self, request, *args, **kwargs):
        user = request.user
        data = request.data
        files = request.FILES

        # 1. Update User Profile
        user.first_name = data.get('first_name', user.first_name)
        user.last_name = data.get('last_name', user.last_name)
        user.phone_number = data.get('phone_number', user.phone_number)
        user.location = data.get('address', user.location) 
        user.apply_as_guide() 
        user.save()

        # 2. Handle Documents
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

        # 3. Create/Update Review Request
        review_request, created = GuideReviewRequest.objects.get_or_create(
            applicant=user,
            defaults={'status': 'Pending'}
        )
        if not created and review_request.status != 'Pending':
             review_request.status = 'Pending'
             review_request.reviewed_by = None
             review_request.save()
        
        return Response({
            "detail": "Guide application submitted successfully.",
            "review_request_id": review_request.pk
        }, status=status.HTTP_201_CREATED)


# --- 2. Admin Review ViewSet (UPDATED) ---

class GuideReviewRequestViewSet(viewsets.ModelViewSet):
    """
    Admin-only ViewSet.
    GET / -> Lists all applications (uses AdminGuideReviewSerializer)
    PATCH /:id/ -> Updates status (Approve/Reject)
    """
    serializer_class = AdminGuideReviewSerializer # <--- Uses the new serializer
    permission_classes = [permissions.IsAdminUser] 
    http_method_names = ['get', 'patch', 'head', 'options'] # Restrict methods

    def get_queryset(self):
        # Return all requests, typically Pending ones first
        return GuideReviewRequest.objects.select_related('applicant', 'applicant__guide_application').all().order_by('submission_date')
    
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        # This handles the PATCH request from React
        instance = self.get_object()
        
        # We use partial=True because React might only send {'status': 'Approved'}
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        
        # 1. Save the changes
        serializer.save(reviewed_by=request.user)

        # 2. Handle Role Logic based on Status
        if new_status == 'Approved':
            # Validates the guide logic defined in your model
            # Triggers the SystemAlert via the Model's save method logic you wrote previously
            pass 
            
        elif new_status == 'Rejected':
            user = instance.applicant
            user.is_local_guide = False
            user.guide_approved = False
            user.save()

        return Response(serializer.data)


# --- 3. User Alerts Views (Unchanged) ---

class UserAlertListView(generics.ListAPIView):
    serializer_class = SystemAlertSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        target_role = 'Guide' if user.guide_approved else 'Tourist'
        return SystemAlert.objects.filter(
            Q(recipient=user) | Q(recipient=user, target_type=target_role)
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