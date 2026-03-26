from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from decimal import Decimal

from .models import Agency, TouristGuide
from .serializers import AgencySerializer, TouristGuideSerializer

User = get_user_model()


class AgencyModelTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="agency_owner", password="Pass12345")

	def test_agency_defaults(self):
		agency = Agency.objects.create(
			user=self.user,
			business_name="North Adventures",
			owner_name="Ana Cruz",
			email="agency@example.com",
		)
		self.assertFalse(agency.is_approved)
		self.assertEqual(agency.down_payment_percentage, Decimal("30.0"))

	def test_tourist_guide_full_name(self):
		agency = Agency.objects.create(
			user=self.user,
			business_name="City Guides",
			owner_name="Ana Cruz",
			email="city@example.com",
			is_approved=True,
		)
		guide = TouristGuide.objects.create(
			agency=agency,
			first_name="Juan",
			last_name="Dela Cruz",
			contact_number="09171234567",
		)
		self.assertEqual(guide.full_name(), "Juan Dela Cruz")


class AgencySerializerTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="owner2", password="Pass12345")

	def test_agency_serializer_rejects_invalid_phone(self):
		serializer = AgencySerializer(
			data={
				"user": self.user.id,
				"business_name": "West Trails",
				"owner_name": "Leo Tan",
				"email": "west@example.com",
				"phone": "invalid-phone",
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("phone", serializer.errors)

	def test_tourist_guide_serializer_rejects_invalid_contact(self):
		agency = Agency.objects.create(
			user=self.user,
			business_name="South Trails",
			owner_name="Leo Tan",
			email="south@example.com",
			is_approved=True,
		)
		serializer = TouristGuideSerializer(
			data={
				"agency": agency.id,
				"first_name": "Ava",
				"last_name": "Lim",
				"contact_number": "123",
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("contact_number", serializer.errors)


class AgencyApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="agency_api", password="Pass12345")

	def test_agency_list_is_public(self):
		response = self.client.get(reverse("agency-list"))
		self.assertEqual(response.status_code, 200)

	def test_agency_guide_list_requires_authentication(self):
		response = self.client.get(reverse("agency-guide-list"))
		self.assertEqual(response.status_code, 401)

	def test_agency_profile_requires_authentication(self):
		response = self.client.get(reverse("agency-profile"))
		self.assertEqual(response.status_code, 401)
