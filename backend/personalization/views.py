from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Personalization
from destinations_and_attractions.models import Destination
from destinations_and_attractions.serializers import DestinationSerializer
from .serializers import PersonalizationDetailSerializer

class OnboardingDestinationsView(generics.ListAPIView):
    """
    Returns destinations sorted by Featured, Category, then Rating.
    Frontend will perform grouping and limiting.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = DestinationSerializer
    pagination_class = None

    def get_queryset(self):
        return Destination.objects.all().order_by('-is_featured', 'category', '-average_rating')

class UpdatePersonalizationView(views.APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        profile, created = Personalization.objects.get_or_create(user=request.user)
        
        destination_ids = request.data.get('destination_ids')
        if destination_ids is not None:
            profile.preferred_destinations.set(destination_ids)
        
        if request.data.get('mark_complete', False):
            profile.onboarding_completed = True
            
        profile.save()
        return Response({"status": "success"}, status=status.HTTP_200_OK)

class PersonalizationDetailView(generics.RetrieveAPIView):
    """
    Returns the user's specific personalization profile.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = PersonalizationDetailSerializer

    def get_object(self):
        # Get the profile for the current user
        profile, created = Personalization.objects.get_or_create(user=self.request.user)
        
        # --- DEBUG LOGGING (Check your terminal) ---
        print(f"\n--- PERSONALIZATION DEBUG ---")
        print(f"User: {self.request.user.username} (ID: {self.request.user.id})")
        print(f"Profile ID: {profile.id}")
        count = profile.preferred_destinations.count()
        print(f"Destinations Found in DB: {count}")
        if count > 0:
            ids = list(profile.preferred_destinations.values_list('id', flat=True))
            print(f"Destination IDs: {ids}")
        else:
            print("WARNING: This user has NO preferred destinations in the database.")
        print(f"-----------------------------\n")
        # -------------------------------------------

        return profile