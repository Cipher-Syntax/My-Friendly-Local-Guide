from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from destinations_and_attractions.models import Destination

from .models import Personalization
from .serializers import PersonalizationDetailSerializer

User = get_user_model()


class PersonalizationModelTests(TestCase):
	def test_profile_string_representation(self):
		user = User.objects.create_user(username="pers_user", password="Pass12345")
		profile = Personalization.objects.create(user=user)
		self.assertEqual(str(profile), "Profile for pers_user")


class PersonalizationSerializerTests(TestCase):
	def test_detail_serializer_returns_nested_destinations(self):
		user = User.objects.create_user(username="pers_user2", password="Pass12345")
		destination = Destination.objects.create(
			name="Davao",
			description="Southern city",
			category="Adventure",
			location="Davao",
		)
		profile = Personalization.objects.create(user=user, onboarding_completed=True)
		profile.preferred_destinations.add(destination)

		data = PersonalizationDetailSerializer(profile).data
		self.assertEqual(len(data["preferred_destinations"]), 1)
		self.assertEqual(data["preferred_destinations"][0]["name"], "Davao")


class PersonalizationApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="pers_api", password="Pass12345")
		self.destination = Destination.objects.create(
			name="Manila",
			description="Capital",
			category="Historical",
			location="NCR",
		)

	def test_update_requires_authentication(self):
		response = self.client.patch(reverse("update-personalization"), {}, format="json")
		self.assertEqual(response.status_code, 401)

	def test_authenticated_user_can_update_personalization(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.patch(
			reverse("update-personalization"),
			{"destination_ids": [self.destination.id], "mark_complete": True},
			format="json",
		)
		self.assertEqual(response.status_code, 200)
		profile = Personalization.objects.get(user=self.user)
		self.assertTrue(profile.onboarding_completed)
		self.assertEqual(profile.preferred_destinations.count(), 1)

	def test_me_endpoint_creates_profile_when_missing(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.get(reverse("my-personalization"))
		self.assertEqual(response.status_code, 200)
		self.assertTrue(Personalization.objects.filter(user=self.user).exists())
