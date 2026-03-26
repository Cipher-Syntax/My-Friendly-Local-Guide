from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import FavoriteGuide
from .serializers import UserSerializer

User = get_user_model()


class UserAuthenticationModelTests(TestCase):
	def test_apply_as_guide_sets_expected_flags(self):
		user = User.objects.create_user(username="regular_user", password="Pass12345")
		self.assertFalse(user.is_local_guide)

		user.apply_as_guide()
		user.refresh_from_db()

		self.assertTrue(user.is_local_guide)
		self.assertFalse(user.guide_approved)


class UserAuthenticationSerializerTests(TestCase):
	def test_user_serializer_rejects_mismatched_passwords(self):
		serializer = UserSerializer(
			data={
				"username": "new_user",
				"email": "new@example.com",
				"password": "Pass12345",
				"confirm_password": "Wrong12345",
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("confirm_password", serializer.errors)


class UserAuthenticationApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="api_user", password="Pass12345")
		self.guide = User.objects.create_user(
			username="fav_guide",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)

	def test_profile_endpoint_requires_authentication(self):
		response = self.client.get(reverse("profile-update"))
		self.assertEqual(response.status_code, 401)

	def test_accept_terms_success_for_authenticated_user(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.post(reverse("accept-terms"), {}, format="json")
		self.assertEqual(response.status_code, 200)
		self.user.refresh_from_db()
		self.assertTrue(self.user.has_accepted_terms)

	def test_toggle_favorite_guide_add_and_remove(self):
		self.client.force_authenticate(user=self.user)

		add_response = self.client.post(
			reverse("toggle-favorite-guide"),
			{"guide_id": self.guide.id},
			format="json",
		)
		self.assertEqual(add_response.status_code, 201)
		self.assertTrue(FavoriteGuide.objects.filter(user=self.user, guide=self.guide).exists())

		remove_response = self.client.post(
			reverse("toggle-favorite-guide"),
			{"guide_id": self.guide.id},
			format="json",
		)
		self.assertEqual(remove_response.status_code, 200)
		self.assertFalse(FavoriteGuide.objects.filter(user=self.user, guide=self.guide).exists())
