from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from accommodation_booking.models import Booking
from destinations_and_attractions.models import Destination

from .models import Payment, RefundRequest
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


@override_settings(
	STORAGES={
		"default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
		"staticfiles": {"BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage"},
	}
)
class RefundApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()

		self.tourist = User.objects.create_user(username="tourist_ref", password="Pass12345")
		self.guide = User.objects.create_user(
			username="guide_ref",
			password="Pass12345",
			is_local_guide=True,
			guide_approved=True,
		)
		self.admin = User.objects.create_superuser(
			username="admin_ref",
			email="admin_ref@example.com",
			password="Pass12345",
		)

		self.destination = Destination.objects.create(
			name="Davao",
			description="Nature and culture",
			category="Nature",
			location="Davao",
		)

		self.booking = Booking.objects.create(
			tourist=self.tourist,
			guide=self.guide,
			destination=self.destination,
			check_in=date.today() + timedelta(days=7),
			check_out=date.today() + timedelta(days=8),
			num_guests=2,
			status="Confirmed",
			total_price=Decimal("8000.00"),
			down_payment=Decimal("2400.00"),
			balance_due=Decimal("5600.00"),
		)

		self.payment = Payment.objects.create(
			payer=self.tourist,
			payment_type="Booking",
			related_booking=self.booking,
			amount=Decimal("2400.00"),
			status="succeeded",
		)

	def _proof_file(self, filename="proof.png"):
		# Minimal valid 1x1 PNG binary to keep file validators/storage integrations happy.
		png_1x1 = (
			b"\x89PNG\r\n\x1a\n"
			b"\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89"
			b"\x00\x00\x00\x0cIDATx\x9cc``\xf8\x0f\x00\x01\x01\x01\x00\x18\xdd\x8d\xb3"
			b"\x00\x00\x00\x00IEND\xaeB`\x82"
		)
		return SimpleUploadedFile(filename, png_1x1, content_type="image/png")

	def test_tourist_can_request_refund(self):
		self.client.force_authenticate(user=self.tourist)

		response = self.client.post(
			reverse("refund-request"),
			{
				"booking_id": self.booking.id,
				"reason": "Trip cancelled due to emergency.",
				"requested_amount": "2400.00",
				"proof_attachment": self._proof_file(),
			},
			format="multipart",
		)

		self.assertEqual(response.status_code, 201)
		self.assertEqual(RefundRequest.objects.count(), 1)
		self.payment.refresh_from_db()
		self.assertEqual(self.payment.refund_status, "requested")

	def test_non_admin_cannot_process_refund(self):
		refund = RefundRequest.objects.create(
			payment=self.payment,
			booking=self.booking,
			requested_by=self.tourist,
			reason="Need refund",
			requested_amount=Decimal("1000.00"),
			proof_attachment=self._proof_file("proof2.png"),
		)

		self.client.force_authenticate(user=self.guide)
		response = self.client.post(
			reverse("refund-process", args=[refund.id]),
			{"action": "approve", "approved_amount": "1000.00"},
			format="json",
		)

		self.assertEqual(response.status_code, 403)

	def test_refund_request_rejected_when_too_close_to_check_in(self):
		self.booking.check_in = date.today() + timedelta(days=1)
		self.booking.save(update_fields=["check_in"])

		self.client.force_authenticate(user=self.tourist)
		response = self.client.post(
			reverse("refund-request"),
			{
				"booking_id": self.booking.id,
				"reason": "Unexpected conflict with travel schedule.",
				"requested_amount": "2400.00",
				"proof_attachment": self._proof_file("proof-late.png"),
			},
			format="multipart",
		)

		self.assertEqual(response.status_code, 400)
		self.assertIn("booking_id", response.json())

	def test_admin_can_approve_and_complete_refund(self):
		refund = RefundRequest.objects.create(
			payment=self.payment,
			booking=self.booking,
			requested_by=self.tourist,
			reason="Provider cancelled.",
			requested_amount=Decimal("2400.00"),
			proof_attachment=self._proof_file("proof3.png"),
		)

		self.client.force_authenticate(user=self.admin)

		approve_response = self.client.post(
			reverse("refund-process", args=[refund.id]),
			{"action": "approve", "approved_amount": "2400.00", "admin_notes": "Eligible under policy."},
			format="json",
		)
		self.assertEqual(approve_response.status_code, 200)

		complete_response = self.client.post(
			reverse("refund-process", args=[refund.id]),
			{"action": "complete", "approved_amount": "2400.00"},
			format="json",
		)
		self.assertEqual(complete_response.status_code, 200)

		refund.refresh_from_db()
		self.payment.refresh_from_db()
		self.booking.refresh_from_db()

		self.assertEqual(refund.status, "completed")
		self.assertEqual(self.payment.status, "refunded")
		self.assertEqual(self.payment.refund_status, "completed")
		self.assertEqual(self.booking.status, "Refunded")

	def test_tourist_can_view_own_refund_detail(self):
		refund = RefundRequest.objects.create(
			payment=self.payment,
			booking=self.booking,
			requested_by=self.tourist,
			reason="Need refund detail.",
			requested_amount=Decimal("1400.00"),
			admin_notes="Reviewed by admin.",
			proof_attachment=self._proof_file("proof4.png"),
		)

		self.client.force_authenticate(user=self.tourist)
		response = self.client.get(reverse("refund-detail", args=[refund.id]))

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.json().get("id"), refund.id)
		self.assertEqual(response.json().get("admin_notes"), "Reviewed by admin.")

	def test_provider_cannot_view_tourist_refund_detail(self):
		refund = RefundRequest.objects.create(
			payment=self.payment,
			booking=self.booking,
			requested_by=self.tourist,
			reason="Need refund detail privacy.",
			requested_amount=Decimal("1200.00"),
			proof_attachment=self._proof_file("proof5.png"),
		)

		self.client.force_authenticate(user=self.guide)
		response = self.client.get(reverse("refund-detail", args=[refund.id]))

		self.assertEqual(response.status_code, 403)
