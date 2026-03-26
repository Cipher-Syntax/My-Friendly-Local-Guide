from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from destinations_and_attractions.models import Destination, TourPackage

from .models import Accommodation, Booking
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


class AccommodationModelTests(TestCase):
	def test_accommodation_string_representation(self):
		# Keep this as a pure unit test: __str__ does not require DB save or file upload.
		accommodation = Accommodation(title="Cozy Inn")

		self.assertEqual(str(accommodation), "Cozy Inn")
