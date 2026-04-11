import json

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Destination, TourPackage
from .serializers import TourPackageSerializer

User = get_user_model()


class DestinationsModelTests(TestCase):
	def setUp(self):
		self.guide = User.objects.create_user(
			username="guide_dest",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
			is_guide_visible=True,
		)
		self.destination = Destination.objects.create(
			name="Siargao",
			description="Surf island",
			category="Islands",
			location="Surigao del Norte",
		)

	def test_tour_package_string_representation(self):
		tour = TourPackage.objects.create(
			guide=self.guide,
			main_destination=self.destination,
			name="Island Hopper",
			description="Day tour",
			duration="1 day",
			duration_days=1,
			max_group_size=6,
			price_per_day="2500.00",
			solo_price="3000.00",
		)
		self.assertIn("Island Hopper", str(tour))


class DestinationsSerializerTests(TestCase):
	def setUp(self):
		self.guide = User.objects.create_user(
			username="guide_serial",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.destination = Destination.objects.create(
			name="Bohol",
			description="Chocolate hills",
			category="Nature",
			location="Bohol",
		)

	def test_tour_package_serializer_parses_itinerary_json_string(self):
		serializer = TourPackageSerializer(
			data={
				"destination_id": self.destination.id,
				"name": "Bohol Circuit",
				"description": "Scenic",
				"duration": "2 days",
				"duration_days": 2,
				"max_group_size": 8,
				"price_per_day": "1800.00",
				"solo_price": "2600.00",
				"itinerary_timeline": json.dumps([
					{"day": 1, "activityName": "Hills"},
					{"day": 2, "activityName": "River cruise"},
				]),
			}
		)
		self.assertTrue(serializer.is_valid(), serializer.errors)
		tour = serializer.save(guide=self.guide)
		self.assertIsInstance(tour.itinerary_timeline, list)
		self.assertEqual(len(tour.itinerary_timeline), 2)


class DestinationsApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="u1", password="Pass12345")
		self.admin = User.objects.create_user(username="admin1", password="Pass12345", is_staff=True)

	def test_categories_endpoint_is_public(self):
		response = self.client.get(reverse("category-choices"))
		self.assertEqual(response.status_code, 401)

	def test_categories_endpoint_returns_data_for_authenticated_user(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.get(reverse("category-choices"))
		self.assertEqual(response.status_code, 200)
		self.assertIn("Cultural", response.json())

	def test_non_admin_cannot_add_category(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.post(reverse("category-choices"), {"name": "Eco Tourism"}, format="json")
		self.assertEqual(response.status_code, 403)

	def test_admin_can_add_category(self):
		self.client.force_authenticate(user=self.admin)
		create_response = self.client.post(reverse("category-choices"), {"name": "Eco Tourism"}, format="json")
		self.assertEqual(create_response.status_code, 201)
		self.assertEqual(create_response.json().get("category"), "Eco Tourism")

		list_response = self.client.get(reverse("category-choices"))
		self.assertEqual(list_response.status_code, 200)
		self.assertIn("Eco Tourism", list_response.json())

	def test_admin_can_create_destination_with_custom_category(self):
		self.client.force_authenticate(user=self.admin)
		response = self.client.post(
			reverse("destination-list"),
			{
				"name": "Gourmet Trail",
				"description": "Food and local delicacies",
				"category": "Food Trip",
				"location": "Davao City",
			},
			format="json",
		)
		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.json().get("category"), "Food Trip")

	def test_destination_list_is_public(self):
		response = self.client.get(reverse("destination-list"))
		self.assertEqual(response.status_code, 200)

	def test_non_admin_cannot_create_destination(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.post(
			reverse("destination-list"),
			{
				"name": "Sagada",
				"description": "Mountain",
				"category": "Mountains",
				"location": "Mountain Province",
			},
			format="json",
		)
		self.assertEqual(response.status_code, 403)
