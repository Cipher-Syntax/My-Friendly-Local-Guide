from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from agency_management_module.models import Agency
from destinations_and_attractions.models import Destination, TourPackage

from .models import Accommodation, Booking, BookingJourneyCheckpoint
from .serializers import BookingSerializer

User = get_user_model()


class AccommodationBookingModelTests(TestCase):
	def setUp(self):
		self.tourist = User.objects.create_user(username="tourist", password="Pass12345")
		self.guide = User.objects.create_user(
			username="guide",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.destination = Destination.objects.create(
			name="Baguio",
			description="Cool city",
			category="Nature",
			location="Benguet",
		)

	def test_booking_requires_target(self):
		booking = Booking(
			tourist=self.tourist,
			check_in=date.today() + timedelta(days=2),
			check_out=date.today() + timedelta(days=3),
			num_guests=1,
		)

		with self.assertRaises(ValidationError):
			booking.save()

	def test_overlapping_confirmed_guide_booking_is_rejected(self):
		Booking.objects.create(
			tourist=self.tourist,
			guide=self.guide,
			destination=self.destination,
			check_in=date.today() + timedelta(days=5),
			check_out=date.today() + timedelta(days=7),
			num_guests=1,
			status="Confirmed",
		)

		with self.assertRaises(ValidationError):
			Booking.objects.create(
				tourist=self.tourist,
				guide=self.guide,
				destination=self.destination,
				check_in=date.today() + timedelta(days=6),
				check_out=date.today() + timedelta(days=8),
				num_guests=1,
				status="Confirmed",
			)


class AccommodationBookingSerializerTests(TestCase):
	def setUp(self):
		self.guide = User.objects.create_user(
			username="guide2",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.agency_user = User.objects.create_user(
			username="agency_owner_1",
			password="Pass12345",
			is_staff=True,
		)
		self.agency_profile = Agency.objects.create(
			user=self.agency_user,
			business_name="Island Movers",
			owner_name="Ana Cruz",
			email="agency-owner-1@example.com",
		)
		self.destination = Destination.objects.create(
			name="Palawan",
			description="Island",
			category="Islands",
			location="Palawan",
		)

	def test_additional_guest_names_invalid_json_becomes_empty_list(self):
		serializer = BookingSerializer()
		self.assertEqual(serializer.validate_additional_guest_names("not-json"), [])

	def test_check_out_before_check_in_fails(self):
		serializer = BookingSerializer(
			data={
				"guide": self.guide.id,
				"destination": self.destination.id,
				"check_in": str(date.today() + timedelta(days=4)),
				"check_out": str(date.today() + timedelta(days=3)),
				"num_guests": 2,
			}
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("check_out", serializer.errors)

	def test_num_guests_above_tour_max_pax_fails(self):
		package = TourPackage.objects.create(
			guide=self.guide,
			main_destination=self.destination,
			name="Palawan Day Tour",
			description="Island hopping",
			duration="2 days",
			duration_days=2,
			max_group_size=10,
			price_per_day="3000.00",
			solo_price="3500.00",
		)

		class DummyRequest:
			data = {"tour_package_id": str(package.id)}

		serializer = BookingSerializer(
			data={
				"guide": self.guide.id,
				"destination": self.destination.id,
				"check_in": str(date.today() + timedelta(days=10)),
				"check_out": str(date.today() + timedelta(days=11)),
				"num_guests": 999,
			},
			context={"request": DummyRequest()},
		)

		self.assertFalse(serializer.is_valid())
		self.assertIn("num_guests", serializer.errors)

	def test_agency_num_guests_above_tour_max_pax_fails(self):
		package = TourPackage.objects.create(
			agency=self.agency_profile,
			main_destination=self.destination,
			name="Agency Explorer",
			description="Agency managed tour",
			duration="2 days",
			duration_days=2,
			max_group_size=5,
			price_per_day="4200.00",
			solo_price="4500.00",
		)

		class DummyRequest:
			data = {"tour_package_id": str(package.id)}

		serializer = BookingSerializer(
			data={
				"agency": self.agency_user.id,
				"destination": self.destination.id,
				"check_in": str(date.today() + timedelta(days=10)),
				"check_out": str(date.today() + timedelta(days=11)),
				"num_guests": 10,
			},
			context={"request": DummyRequest()},
		)

		self.assertFalse(serializer.is_valid())
		self.assertIn("num_guests", serializer.errors)


class AccommodationBookingApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="api_user", password="Pass12345")

	def test_booking_list_requires_authentication(self):
		response = self.client.get(reverse("booking-list"))
		self.assertEqual(response.status_code, 401)

	def test_accommodation_dropdown_requires_authentication(self):
		response = self.client.get(reverse("accommodation-dropdown-list"))
		self.assertEqual(response.status_code, 401)

	def test_authenticated_user_can_access_booking_list(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.get(reverse("booking-list"))
		self.assertEqual(response.status_code, 200)


class AgencyConcurrentBookingsApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.requesting_tourist = User.objects.create_user(username="tourist_requester", password="Pass12345")
		self.other_tourist = User.objects.create_user(username="tourist_other", password="Pass12345")
		self.another_tourist = User.objects.create_user(username="tourist_another", password="Pass12345")
		self.agency_user = User.objects.create_user(
			username="agency_manifest_owner",
			password="Pass12345",
			is_staff=True,
		)
		self.other_agency_user = User.objects.create_user(
			username="agency_other_owner",
			password="Pass12345",
			is_staff=True,
		)

		self.destination = Destination.objects.create(
			name="Siargao",
			description="Island destination",
			category="Islands",
			location="Surigao del Norte",
		)
		self.other_destination = Destination.objects.create(
			name="Bohol",
			description="Chocolate hills",
			category="Nature",
			location="Bohol",
		)

		self.window_start = date.today() + timedelta(days=6)
		self.window_end = date.today() + timedelta(days=8)

		self.overlap_a = Booking.objects.create(
			tourist=self.other_tourist,
			agency=self.agency_user,
			destination=self.destination,
			check_in=date.today() + timedelta(days=5),
			check_out=date.today() + timedelta(days=7),
			num_guests=2,
			status="Confirmed",
		)
		self.overlap_b = Booking.objects.create(
			tourist=self.another_tourist,
			agency=self.agency_user,
			destination=self.destination,
			check_in=date.today() + timedelta(days=7),
			check_out=date.today() + timedelta(days=9),
			num_guests=3,
			status="Accepted",
		)
		self.my_overlap = Booking.objects.create(
			tourist=self.requesting_tourist,
			agency=self.agency_user,
			destination=self.destination,
			check_in=date.today() + timedelta(days=6),
			check_out=date.today() + timedelta(days=7),
			num_guests=1,
			status="Confirmed",
		)
		self.non_overlap = Booking.objects.create(
			tourist=self.other_tourist,
			agency=self.agency_user,
			destination=self.destination,
			check_in=date.today() + timedelta(days=20),
			check_out=date.today() + timedelta(days=21),
			num_guests=1,
			status="Confirmed",
		)
		self.other_agency_overlap = Booking.objects.create(
			tourist=self.other_tourist,
			agency=self.other_agency_user,
			destination=self.destination,
			check_in=date.today() + timedelta(days=6),
			check_out=date.today() + timedelta(days=7),
			num_guests=2,
			status="Confirmed",
		)
		self.other_destination_overlap = Booking.objects.create(
			tourist=self.other_tourist,
			agency=self.agency_user,
			destination=self.other_destination,
			check_in=date.today() + timedelta(days=6),
			check_out=date.today() + timedelta(days=7),
			num_guests=2,
			status="Confirmed",
		)

	def test_manifest_requires_authentication(self):
		response = self.client.get(
			reverse("booking-agency-concurrent-bookings"),
			{
				"agency_id": self.agency_user.id,
				"check_in": self.window_start.isoformat(),
				"check_out": self.window_end.isoformat(),
			},
		)
		self.assertEqual(response.status_code, 401)

	def test_manifest_returns_overlapping_bookings_for_selected_agency(self):
		self.client.force_authenticate(user=self.requesting_tourist)
		response = self.client.get(
			reverse("booking-agency-concurrent-bookings"),
			{
				"agency_id": self.agency_user.id,
				"check_in": self.window_start.isoformat(),
				"check_out": self.window_end.isoformat(),
				"destination_id": self.destination.id,
			},
		)

		self.assertEqual(response.status_code, 200)
		returned_ids = {item["id"] for item in response.data}

		self.assertIn(self.overlap_a.id, returned_ids)
		self.assertIn(self.overlap_b.id, returned_ids)
		self.assertNotIn(self.my_overlap.id, returned_ids)
		self.assertNotIn(self.non_overlap.id, returned_ids)
		self.assertNotIn(self.other_agency_overlap.id, returned_ids)
		self.assertNotIn(self.other_destination_overlap.id, returned_ids)

	def test_manifest_respects_exclude_booking_id(self):
		self.client.force_authenticate(user=self.requesting_tourist)
		response = self.client.get(
			reverse("booking-agency-concurrent-bookings"),
			{
				"agency_id": self.agency_user.id,
				"check_in": self.window_start.isoformat(),
				"check_out": self.window_end.isoformat(),
				"exclude_booking_id": self.overlap_a.id,
			},
		)

		self.assertEqual(response.status_code, 200)
		returned_ids = {item["id"] for item in response.data}
		self.assertNotIn(self.overlap_a.id, returned_ids)
		self.assertIn(self.overlap_b.id, returned_ids)


class BookingJourneyApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.tourist = User.objects.create_user(username="journey_tourist", password="Pass12345")
		self.guide = User.objects.create_user(
			username="journey_guide",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.other_user = User.objects.create_user(username="journey_other", password="Pass12345")

		self.destination = Destination.objects.create(
			name="Camiguin",
			description="Island of fire",
			category="Islands",
			location="Northern Mindanao",
		)

		self.package = TourPackage.objects.create(
			guide=self.guide,
			main_destination=self.destination,
			name="Camiguin Highlights",
			description="Guided island route",
			duration="2 days",
			duration_days=2,
			max_group_size=5,
			price_per_day="3500.00",
			solo_price="4000.00",
			additional_fee_per_head="500.00",
			itinerary_timeline=[
				{"day": 1, "activityName": "White Island", "startTime": "08:00", "endTime": "10:00", "type": "activity"},
				{"day": 1, "activityName": "Sunken Cemetery", "startTime": "11:00", "endTime": "12:00", "type": "activity"},
			],
		)

		self.booking = Booking.objects.create(
			tourist=self.tourist,
			guide=self.guide,
			destination=self.destination,
			tour_package=self.package,
			check_in=date.today() + timedelta(days=3),
			check_out=date.today() + timedelta(days=4),
			num_guests=2,
			status="Confirmed",
		)

		self.list_url = reverse("booking-journey-list-create", kwargs={"pk": self.booking.id})

	def test_journey_list_requires_authentication(self):
		response = self.client.get(self.list_url)
		self.assertEqual(response.status_code, 401)

	def test_participant_can_bootstrap_and_list_checkpoints(self):
		self.client.force_authenticate(user=self.tourist)
		response = self.client.get(self.list_url)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.data), 2)
		self.assertEqual(BookingJourneyCheckpoint.objects.filter(booking=self.booking).count(), 2)

	def test_non_participant_cannot_access_booking_journey(self):
		self.client.force_authenticate(user=self.other_user)
		response = self.client.get(self.list_url)
		self.assertEqual(response.status_code, 403)

	def test_tourist_can_update_check_and_tourist_remarks(self):
		self.client.force_authenticate(user=self.tourist)
		self.client.get(self.list_url)
		checkpoint = BookingJourneyCheckpoint.objects.filter(booking=self.booking).order_by('id').first()

		detail_url = reverse(
			"booking-journey-checkpoint-detail",
			kwargs={"pk": self.booking.id, "checkpoint_id": checkpoint.id},
		)
		response = self.client.patch(
			detail_url,
			{"is_checked": True, "tourist_remarks": "Visited as planned."},
			format="json",
		)

		self.assertEqual(response.status_code, 200)
		checkpoint.refresh_from_db()
		self.assertTrue(checkpoint.is_checked)
		self.assertEqual(checkpoint.tourist_remarks, "Visited as planned.")

	def test_tourist_cannot_update_guide_remarks(self):
		self.client.force_authenticate(user=self.tourist)
		self.client.get(self.list_url)
		checkpoint = BookingJourneyCheckpoint.objects.filter(booking=self.booking).order_by('id').first()

		detail_url = reverse(
			"booking-journey-checkpoint-detail",
			kwargs={"pk": self.booking.id, "checkpoint_id": checkpoint.id},
		)
		response = self.client.patch(
			detail_url,
			{"guide_remarks": "Provider side note"},
			format="json",
		)

		self.assertEqual(response.status_code, 400)
		self.assertIn("guide_remarks", response.data)

	def test_provider_can_update_guide_remarks(self):
		self.client.force_authenticate(user=self.tourist)
		self.client.get(self.list_url)
		checkpoint = BookingJourneyCheckpoint.objects.filter(booking=self.booking).order_by('id').first()

		self.client.force_authenticate(user=self.guide)
		detail_url = reverse(
			"booking-journey-checkpoint-detail",
			kwargs={"pk": self.booking.id, "checkpoint_id": checkpoint.id},
		)
		response = self.client.patch(
			detail_url,
			{"guide_remarks": "Tourist arrived at correct stop."},
			format="json",
		)

		self.assertEqual(response.status_code, 200)
		checkpoint.refresh_from_db()
		self.assertEqual(checkpoint.guide_remarks, "Tourist arrived at correct stop.")


class AccommodationModelTests(TestCase):
	def test_accommodation_string_representation(self):
		# Keep this as a pure unit test: __str__ does not require DB save or file upload.
		accommodation = Accommodation(title="Cozy Inn")

		self.assertEqual(str(accommodation), "Cozy Inn")
