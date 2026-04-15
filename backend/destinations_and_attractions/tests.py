import json
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from .models import Destination, TourPackage, LocationCorrectionRequest
from .serializers import TourPackageSerializer
from .views import _get_previous_day_window

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
			location="Pagadian City",
			municipality="Pagadian City",
			latitude="7.825100",
			longitude="123.436900",
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
			location="Pagadian City",
			municipality="Pagadian City",
			latitude="7.824500",
			longitude="123.437200",
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
		self.guide = User.objects.create_user(
			username="trusted_guide",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.destination = Destination.objects.create(
			name="Pagadian Rotonda",
			description="City center",
			category="Cultural",
			location="Pagadian City",
			municipality="Pagadian City",
			latitude="7.825000",
			longitude="123.437000",
		)

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
				"location": "Pagadian City",
				"municipality": "Pagadian City",
				"latitude": "7.830000",
				"longitude": "123.450000",
			},
			format="json",
		)
		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.json().get("category"), "Food Trip")

	def test_admin_cannot_create_destination_outside_zds_bounds(self):
		self.client.force_authenticate(user=self.admin)
		response = self.client.post(
			reverse("destination-list"),
			{
				"name": "Out of Scope",
				"description": "Invalid coords",
				"category": "Adventure",
				"location": "Pagadian City",
				"municipality": "Pagadian City",
				"latitude": "5.000000",
				"longitude": "121.000000",
			},
			format="json",
		)
		self.assertEqual(response.status_code, 400)
		self.assertIn("location", response.json())

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
				"location": "Pagadian City",
				"municipality": "Pagadian City",
				"latitude": "7.810000",
				"longitude": "123.410000",
			},
			format="json",
		)
		self.assertEqual(response.status_code, 403)

	def test_tourist_correction_creates_pending_request(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.post(
			reverse("location-correction-list-create"),
			{
				"target_type": "destination",
				"destination_id": self.destination.id,
				"proposed_location": "Pagadian City Port",
				"proposed_municipality": "Pagadian City",
				"proposed_latitude": "7.832000",
				"proposed_longitude": "123.451000",
				"reason": "Marker is slightly off",
			},
			format="json",
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.json().get("status"), "pending")
		self.destination.refresh_from_db()
		self.assertEqual(self.destination.location, "Pagadian City")

	def test_trusted_guide_correction_auto_applies(self):
		self.client.force_authenticate(user=self.guide)
		response = self.client.post(
			reverse("location-correction-list-create"),
			{
				"target_type": "destination",
				"destination_id": self.destination.id,
				"proposed_location": "Pagadian City Rotunda",
				"proposed_municipality": "Pagadian City",
				"proposed_latitude": "7.826500",
				"proposed_longitude": "123.438500",
				"reason": "Verified by local guide",
			},
			format="json",
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(response.json().get("status"), "approved")
		self.destination.refresh_from_db()
		self.assertEqual(self.destination.location, "Pagadian City Rotunda")

	def test_admin_can_approve_pending_location_correction(self):
		pending = LocationCorrectionRequest.objects.create(
			submitted_by=self.user,
			target_type='destination',
			destination=self.destination,
			current_location=self.destination.location,
			current_municipality=self.destination.municipality or '',
			current_latitude=self.destination.latitude,
			current_longitude=self.destination.longitude,
			proposed_location='Pagadian City Plaza',
			proposed_municipality='Pagadian City',
			proposed_latitude='7.827100',
			proposed_longitude='123.439100',
		)

		self.client.force_authenticate(user=self.admin)
		response = self.client.patch(
			reverse("location-correction-review", kwargs={"pk": pending.id}),
			{"action": "approve", "review_note": "Validated coordinates."},
			format="json",
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json().get("status"), "approved")
		self.destination.refresh_from_db()
		self.assertEqual(self.destination.location, "Pagadian City Plaza")


class DestinationHighlightsApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.guide = User.objects.create_user(
			username="highlights_guide",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.destination = Destination.objects.create(
			name="Dakak",
			description="Beach destination",
			category="Beaches",
			location="Zamboanga City",
			municipality="Zamboanga City",
			latitude="7.050000",
			longitude="122.050000",
		)
		self.other_destination = Destination.objects.create(
			name="Lakewood",
			description="Mountain lake",
			category="Nature",
			location="Zamboanga City",
			municipality="Zamboanga City",
			latitude="7.070000",
			longitude="122.020000",
		)

	def _create_tour_package(self, *, destination, name, created_at):
		package = TourPackage.objects.create(
			guide=self.guide,
			main_destination=destination,
			name=name,
			description="Sample",
			duration="1 day",
			duration_days=1,
			max_group_size=6,
			price_per_day="2500.00",
			solo_price="3000.00",
		)
		TourPackage.objects.filter(id=package.id).update(created_at=created_at)
		package.refresh_from_db()
		return package

	def _manila_day_bounds(self):
		start_yesterday, start_today, _ = _get_previous_day_window()
		return start_yesterday, start_today

	def test_tours_by_destination_supports_previous_day_filter(self):
		start_yesterday, start_today = self._manila_day_bounds()

		yesterday_package = self._create_tour_package(
			destination=self.destination,
			name="Yesterday Tour",
			created_at=start_yesterday + timedelta(hours=6),
		)
		self._create_tour_package(
			destination=self.destination,
			name="Older Tour",
			created_at=start_yesterday - timedelta(hours=2),
		)
		self._create_tour_package(
			destination=self.destination,
			name="Today Tour",
			created_at=start_today + timedelta(hours=3),
		)

		response = self.client.get(
			reverse("tours-by-destination", kwargs={"destination_id": self.destination.id}),
			{"new_packages": "yesterday"},
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		items = payload if isinstance(payload, list) else payload.get("results", [])
		returned_ids = {item["id"] for item in items}

		self.assertEqual(returned_ids, {yesterday_package.id})

	def test_destination_highlights_returns_counts_and_limited_latest_packages(self):
		start_yesterday, start_today = self._manila_day_bounds()

		latest_pkg = self._create_tour_package(
			destination=self.destination,
			name="Newest Yesterday",
			created_at=start_today - timedelta(minutes=5),
		)
		second_pkg = self._create_tour_package(
			destination=self.destination,
			name="Second Yesterday",
			created_at=start_today - timedelta(hours=1),
		)
		self._create_tour_package(
			destination=self.destination,
			name="Third Yesterday",
			created_at=start_yesterday + timedelta(hours=9),
		)
		self._create_tour_package(
			destination=self.destination,
			name="Fourth Yesterday",
			created_at=start_yesterday + timedelta(hours=3),
		)
		self._create_tour_package(
			destination=self.destination,
			name="Today Package",
			created_at=start_today + timedelta(hours=4),
		)
		self._create_tour_package(
			destination=self.other_destination,
			name="Other Destination Yesterday",
			created_at=start_yesterday + timedelta(hours=10),
		)

		response = self.client.get(
			reverse("destination-new-package-highlights"),
			{
				"destination_ids": f"{self.destination.id},{self.other_destination.id}",
				"limit_per_destination": 2,
			},
		)

		self.assertEqual(response.status_code, 200)
		payload = response.json()
		self.assertEqual(payload.get("target_date"), start_yesterday.date().isoformat())

		counts = payload.get("destination_counts", {})
		self.assertEqual(counts.get(str(self.destination.id)), 4, payload)
		self.assertEqual(counts.get(str(self.other_destination.id)), 1, payload)

		destination_entry = next(
			(item for item in payload.get("destinations", []) if item.get("destination_id") == self.destination.id),
			None,
		)
		self.assertIsNotNone(destination_entry)
		self.assertEqual(destination_entry.get("new_packages_count"), 4)

		packages = destination_entry.get("packages", [])
		self.assertEqual(len(packages), 2)
		self.assertEqual([pkg.get("id") for pkg in packages], [latest_pkg.id, second_pkg.id])
