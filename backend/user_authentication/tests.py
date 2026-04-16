from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
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
		adult_birthdate = timezone.localdate() - timedelta(days=25 * 365)
		serializer = UserSerializer(
			data={
				"username": "new_user",
				"email": "new@example.com",
				"first_name": "New",
				"last_name": "User",
				"password": "Pass12345",
				"confirm_password": "Wrong12345",
				"date_of_birth": adult_birthdate.isoformat(),
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("confirm_password", serializer.errors)

	def test_user_serializer_requires_first_and_last_name_on_create(self):
		adult_birthdate = timezone.localdate() - timedelta(days=25 * 365)
		serializer = UserSerializer(
			data={
				"username": "name_missing_user",
				"email": "namemissing@example.com",
				"password": "Pass12345",
				"confirm_password": "Pass12345",
				"date_of_birth": adult_birthdate.isoformat(),
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("first_name", serializer.errors)

	def test_user_serializer_requires_birthdate_on_create(self):
		serializer = UserSerializer(
			data={
				"username": "new_user_missing_birthdate",
				"email": "missingbirthdate@example.com",
				"first_name": "Missing",
				"last_name": "Birthdate",
				"password": "Pass12345",
				"confirm_password": "Pass12345",
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("date_of_birth", serializer.errors)

	def test_user_serializer_rejects_underage_birthdate(self):
		underage_birthdate = timezone.localdate() - timedelta(days=17 * 365)
		serializer = UserSerializer(
			data={
				"username": "new_user_underage",
				"email": "underage@example.com",
				"first_name": "Under",
				"last_name": "Age",
				"password": "Pass12345",
				"confirm_password": "Pass12345",
				"date_of_birth": underage_birthdate.isoformat(),
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("date_of_birth", serializer.errors)

	def test_user_serializer_rejects_out_of_scope_location_coordinates(self):
		adult_birthdate = timezone.localdate() - timedelta(days=25 * 365)
		serializer = UserSerializer(
			data={
				"username": "new_user_2",
				"email": "new2@example.com",
				"first_name": "Out",
				"last_name": "Scope",
				"password": "Pass12345",
				"confirm_password": "Pass12345",
				"date_of_birth": adult_birthdate.isoformat(),
				"location": "Invalid Point",
				"latitude": "6.000000",
				"longitude": "120.000000",
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("location", serializer.errors)


class UserAuthenticationApiTests(TestCase):
	def setUp(self):
		adult_birthdate = timezone.localdate() - timedelta(days=25 * 365)
		self.client = APIClient()
		self.user = User.objects.create_user(
			username="api_user",
			password="Pass12345",
			date_of_birth=adult_birthdate,
		)
		self.guide = User.objects.create_user(
			username="fav_guide",
			password="Pass12345",
			date_of_birth=adult_birthdate,
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

	def test_register_endpoint_rejects_underage_birthdate(self):
		underage_birthdate = timezone.localdate() - timedelta(days=16 * 365)
		response = self.client.post(
			reverse("register"),
			{
				"username": "underage_register",
				"email": "underage.register@example.com",
				"first_name": "Under",
				"middle_name": "Teen",
				"last_name": "Account",
				"password": "Pass12345",
				"confirm_password": "Pass12345",
				"date_of_birth": underage_birthdate.isoformat(),
			},
			format="json",
		)
		self.assertEqual(response.status_code, 400)
		self.assertIn("date_of_birth", response.data)

	def test_token_endpoint_rejects_underage_user(self):
		underage_birthdate = timezone.localdate() - timedelta(days=17 * 365)
		underage_user = User.objects.create_user(
			username="young_user",
			password="Pass12345",
			date_of_birth=underage_birthdate,
			is_active=True,
		)

		response = self.client.post(
			reverse("token_obtain_pair"),
			{"username": underage_user.username, "password": "Pass12345"},
			format="json",
		)

		self.assertEqual(response.status_code, 401)
		self.assertIn("detail", response.data)

	def test_token_endpoint_underage_inactive_user_shows_age_restriction(self):
		underage_birthdate = timezone.localdate() - timedelta(days=17 * 365)
		underage_inactive_user = User.objects.create_user(
			username="young_inactive_user",
			password="Pass12345",
			date_of_birth=underage_birthdate,
			is_active=False,
		)

		response = self.client.post(
			reverse("token_obtain_pair"),
			{"username": underage_inactive_user.username, "password": "Pass12345"},
			format="json",
		)

		self.assertEqual(response.status_code, 401)
		self.assertIn("detail", response.data)
		self.assertIn("18", str(response.data.get("detail", "")))
