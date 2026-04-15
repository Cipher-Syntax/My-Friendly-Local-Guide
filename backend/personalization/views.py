from rest_framework import generics, status, views
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError
from .models import Personalization
from destinations_and_attractions.models import Destination
from destinations_and_attractions.serializers import DestinationSerializer
from .serializers import PersonalizationDetailSerializer
from backend.location_policy import validate_zds_location_payload

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

        location_keys = {
            'preferred_location',
            'preferred_municipality',
            'preferred_latitude',
            'preferred_longitude',
        }
        if any(key in request.data for key in location_keys):
            try:
                normalized = validate_zds_location_payload(
                    location=request.data.get('preferred_location', profile.preferred_location),
                    municipality=request.data.get('preferred_municipality', profile.preferred_municipality),
                    latitude=request.data.get('preferred_latitude', profile.preferred_latitude),
                    longitude=request.data.get('preferred_longitude', profile.preferred_longitude),
                    require_location=False,
                )
            except ValueError as exc:
                raise ValidationError({'preferred_location': str(exc)})

            profile.preferred_location = normalized['location']
            profile.preferred_municipality = normalized['municipality'] or None
            profile.preferred_latitude = normalized['latitude']
            profile.preferred_longitude = normalized['longitude']

        if 'travel_categories' in request.data:
            profile.travel_categories = request.data.get('travel_categories')
            
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