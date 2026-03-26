from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from accommodation_booking.models import Booking
from destinations_and_attractions.models import Destination

from .models import Payment
from .serializers import PaymentInitiationSerializer

User = get_user_model()


class PaymentModelTests(TestCase):
	def test_payment_string_representation(self):
		user = User.objects.create_user(username="payer", password="Pass12345")
		payment = Payment.objects.create(
			payer=user,
			payment_type="YearlySubscription",
			amount="3000.00",
			status="pending",
		)
		self.assertIn("YearlySubscription", str(payment))


class PaymentSerializerTests(TestCase):
	def setUp(self):
		self.user = User.objects.create_user(username="tourist", password="Pass12345")
		self.guide = User.objects.create_user(
			username="guide_pay",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.destination = Destination.objects.create(
			name="Cebu",
			description="City and beach",
			category="Beaches",
			location="Cebu",
		)
		self.booking = Booking.objects.create(
			tourist=self.user,
			guide=self.guide,
			destination=self.destination,
			check_in=date.today() + timedelta(days=5),
			check_out=date.today() + timedelta(days=6),
			num_guests=2,
			status="Accepted",
			total_price=Decimal("5000.00"),
			down_payment=Decimal("1500.00"),
		)

	def test_payment_initiation_serializer_invalid_booking(self):
		serializer = PaymentInitiationSerializer(data={"booking_id": 999999})
		self.assertFalse(serializer.is_valid())
		self.assertIn("booking_id", serializer.errors)

	def test_payment_initiation_serializer_rejects_non_positive_amount(self):
		serializer = PaymentInitiationSerializer(data={"final_amount": "0.00"})
		self.assertFalse(serializer.is_valid())
		self.assertIn("final_amount", serializer.errors)


class PaymentApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="api_pay", password="Pass12345")

	def test_payment_initiate_requires_authentication(self):
		response = self.client.post(reverse("payment-initiate"), {}, format="json")
		self.assertEqual(response.status_code, 401)

	def test_subscription_price_is_public(self):
		response = self.client.get(reverse("subscription-price"))
		self.assertEqual(response.status_code, 200)
		self.assertIn("price", response.json())
