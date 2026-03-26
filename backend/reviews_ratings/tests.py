from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accommodation_booking.models import Booking
from destinations_and_attractions.models import Destination

from .models import Review
from .serializers import ReviewSerializer

User = get_user_model()


class ReviewsModelTests(TestCase):
	def setUp(self):
		self.tourist = User.objects.create_user(username="tourist_rev", password="Pass12345")
		self.guide = User.objects.create_user(
			username="guide_rev",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.host = User.objects.create_user(
			username="host_rev",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.destination = Destination.objects.create(
			name="Iloilo",
			description="City",
			category="Cultural",
			location="Iloilo",
		)
		self.booking = Booking.objects.create(
			tourist=self.tourist,
			guide=self.guide,
			destination=self.destination,
			check_in=date.today() + timedelta(days=4),
			check_out=date.today() + timedelta(days=5),
			num_guests=1,
			status="Confirmed",
		)

	def test_review_string_representation(self):
		review = Review.objects.create(
			booking=self.booking,
			reviewer=self.tourist,
			reviewed_user=self.guide,
			rating=5,
			comment="Great!",
		)
		self.assertIn("Booking ID", str(review))


class ReviewsSerializerTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="rev_user", password="Pass12345")
		self.other = User.objects.create_user(username="rev_other", password="Pass12345")

	def test_rating_must_be_between_1_and_5(self):
		serializer = ReviewSerializer()
		with self.assertRaisesMessage(Exception, "Rating must be between 1 and 5."):
			serializer.validate_rating(0)

	def test_comment_with_profanity_is_rejected(self):
		serializer = ReviewSerializer()
		with self.assertRaisesMessage(Exception, "inappropriate language"):
			serializer.validate_comment("putangina")


class ReviewsApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.tourist = User.objects.create_user(username="api_tour", password="Pass12345")
		self.guide = User.objects.create_user(
			username="api_guide",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
			guide_rating=0,
		)
		host = User.objects.create_user(
			username="api_host",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		destination = Destination.objects.create(
			name="Bacolod",
			description="Food city",
			category="Cultural",
			location="Negros",
		)
		self.booking = Booking.objects.create(
			tourist=self.tourist,
			guide=self.guide,
			destination=destination,
			check_in=date.today() + timedelta(days=8),
			check_out=date.today() + timedelta(days=9),
			num_guests=1,
			status="Confirmed",
		)

	def test_reviews_post_requires_authentication(self):
		response = self.client.post(reverse("review-list"), {}, format="json")
		self.assertEqual(response.status_code, 401)

	def test_authenticated_review_creation_updates_guide_rating(self):
		self.client.force_authenticate(user=self.tourist)
		response = self.client.post(
			reverse("review-list"),
			{
				"booking": self.booking.id,
				"reviewed_user": self.guide.id,
				"rating": 5,
				"comment": "Excellent guide",
			},
			format="json",
		)
		self.assertEqual(response.status_code, 201)
		self.guide.refresh_from_db()
		self.assertEqual(float(self.guide.guide_rating), 5.0)
