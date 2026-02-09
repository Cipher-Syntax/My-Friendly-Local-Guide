from django.urls import path
from .views import OnboardingDestinationsView, UpdatePersonalizationView, PersonalizationDetailView

urlpatterns = [
    path('onboarding-destinations/', OnboardingDestinationsView.as_view(), name='onboarding-destinations'),
    path('update/', UpdatePersonalizationView.as_view(), name='update-personalization'),
    path('me/', PersonalizationDetailView.as_view(), name='my-personalization'),
]