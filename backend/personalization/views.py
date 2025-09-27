from rest_framework import viewsets, permissions #type: ignore
from .models import Personalization
from .serializers import PersonalizationSerializer

class PersonalizationViewSet(viewsets.ModelViewSet):
    queryset = Personalization.objects.all().order_by('-created_at')
    serializer_class = PersonalizationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Users should only access their own personalization
        return Personalization.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
