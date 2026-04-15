from datetime import date, timedelta
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from accommodation_booking.models import Booking
from agency_management_module.models import Agency
from communication.models import Message
from destinations_and_attractions.models import Destination
from .models import GuideReviewRequest, PushDeviceToken, SystemAlert
from .serializers import PushTokenRegisterSerializer

User = get_user_model()


class SystemManagementModelTests(TestCase):
	def test_new_guide_review_request_creates_submission_alert(self):
		user = User.objects.create_user(username="guide_applicant", password="Pass12345")
		GuideReviewRequest.objects.create(applicant=user)
		self.assertTrue(
			SystemAlert.objects.filter(recipient=user, title="Application Submitted").exists()
		)

	def test_new_message_alert_uses_agency_business_name(self):
		tourist = User.objects.create_user(username="tourist_alerts", password="Pass12345")
		agency_user = User.objects.create_user(
			username="agency_owner_alerts",
			password="Pass12345",
			first_name="Agency",
			last_name="Owner",
		)
		Agency.objects.create(
			user=agency_user,
			business_name="Summit Escape Co.",
			owner_name="Agency Owner",
			email="summit-escape@example.com",
		)

		Message.objects.create(sender=agency_user, receiver=tourist, content="Hello from our agency")

		alert = SystemAlert.objects.filter(recipient=tourist, title="New Message").latest('created_at')
		self.assertIn("Summit Escape Co.", alert.message)


class SystemManagementSerializerTests(TestCase):
	def test_push_token_serializer_rejects_invalid_token_format(self):
		serializer = PushTokenRegisterSerializer(data={"expo_push_token": "invalid-token"})
		self.assertFalse(serializer.is_valid())
		self.assertIn("expo_push_token", serializer.errors)


class SystemManagementApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="alerts_user", password="Pass12345")

	def test_push_token_register_requires_authentication(self):
		response = self.client.post(reverse("push-token-register"), {}, format="json")
		self.assertEqual(response.status_code, 401)

	def test_authenticated_user_can_register_push_token(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.post(
			reverse("push-token-register"),
			{"expo_push_token": "ExponentPushToken[test-token-123]", "platform": "android"},
			format="json",
		)
		self.assertEqual(response.status_code, 200)
		self.assertTrue(PushDeviceToken.objects.filter(user=self.user).exists())

	def test_unread_alert_count_requires_authentication(self):
		response = self.client.get(reverse("unread-alert-count"))
		self.assertEqual(response.status_code, 401)


class AdminPartnerRankingsApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.admin = User.objects.create_superuser(username="admin_rankings", password="Pass12345", email="admin.rankings@example.com")
		self.tourist = User.objects.create_user(username="rankings_tourist", password="Pass12345")
		self.destination = Destination.objects.create(
			name="Burnham Park",
			description="Test destination for rankings",
			category="Nature",
			location="Pagadian City",
			municipality="Pagadian City",
			latitude="7.825000",
			longitude="123.437000",
		)

		self.guide_top = User.objects.create_user(
			username="guide_top",
			password="Pass12345",
			first_name="Top",
			last_name="Guide",
			is_local_guide=True,
			guide_approved=True,
			is_tourist=False,
		)
		self.guide_earner = User.objects.create_user(
			username="guide_earner",
			password="Pass12345",
			first_name="High",
			last_name="Earner",
			is_local_guide=True,
			guide_approved=True,
			is_tourist=False,
		)
		self.guide_zero = User.objects.create_user(
			username="guide_zero",
			password="Pass12345",
			first_name="Zero",
			last_name="Guide",
			is_local_guide=True,
			guide_approved=True,
			is_tourist=False,
		)

		agency_user_top = User.objects.create_user(
			username="agency_top_user",
			password="Pass12345",
			is_staff=True,
			is_tourist=False,
		)
		agency_user_earner = User.objects.create_user(
			username="agency_earner_user",
			password="Pass12345",
			is_staff=True,
			is_tourist=False,
		)

		self.agency_top = Agency.objects.create(
			user=agency_user_top,
			business_name="Top Trails Agency",
			owner_name="Top Owner",
			email="agency.top@example.com",
		)
		self.agency_earner = Agency.objects.create(
			user=agency_user_earner,
			business_name="High Value Agency",
			owner_name="High Owner",
			email="agency.high@example.com",
		)
		self.agency_zero = Agency.objects.create(
			business_name="Zero Bookings Agency",
			owner_name="Zero Owner",
			email="agency.zero@example.com",
		)

	def _create_booking(self, *, guide=None, agency=None, payout="0.00", created_at=None):
		booking = Booking.objects.create(
			tourist=self.tourist,
			guide=guide,
			agency=agency,
			destination=self.destination,
			check_in=date.today(),
			check_out=date.today() + timedelta(days=1),
			num_guests=2,
			total_price=Decimal("1500.00"),
			down_payment=Decimal("500.00"),
			guide_payout_amount=Decimal(payout),
			status="Completed",
		)

		if created_at is not None:
			Booking.objects.filter(pk=booking.pk).update(created_at=created_at)
			booking.refresh_from_db()

		return booking

	def test_partner_rankings_requires_admin_permissions(self):
		self.client.force_authenticate(user=self.tourist)
		response = self.client.get(reverse("admin-partner-rankings"))
		self.assertEqual(response.status_code, 403)

	def test_partner_rankings_include_zero_booking_entities_and_timeframe_filter(self):
		now = timezone.now()
		inside_window = now - timedelta(hours=1)
		outside_window = now - timedelta(days=45)

		self._create_booking(guide=self.guide_top, payout="100.00", created_at=inside_window)
		self._create_booking(guide=self.guide_top, payout="200.00", created_at=inside_window)
		self._create_booking(guide=self.guide_earner, payout="500.00", created_at=inside_window)
		self._create_booking(guide=self.guide_top, payout="900.00", created_at=outside_window)

		self._create_booking(agency=self.agency_top.user, payout="200.00", created_at=inside_window)
		self._create_booking(agency=self.agency_top.user, payout="150.00", created_at=inside_window)
		self._create_booking(agency=self.agency_earner.user, payout="800.00", created_at=inside_window)
		self._create_booking(agency=self.agency_earner.user, payout="700.00", created_at=outside_window)

		self.client.force_authenticate(user=self.admin)
		response = self.client.get(reverse("admin-partner-rankings"), {"timeframe": "Monthly", "limit": 5})

		self.assertEqual(response.status_code, 200)
		payload = response.json()

		self.assertEqual(payload["timeframe"], "Monthly")
		self.assertEqual(payload["top_guides_by_bookings"][0]["id"], self.guide_top.id)
		self.assertEqual(payload["top_guides_by_earnings"][0]["id"], self.guide_earner.id)
		self.assertEqual(payload["least_guides_by_bookings"][0]["id"], self.guide_zero.id)

		guide_top_earnings_entry = next(
			item for item in payload["top_guides_by_earnings"] if item["id"] == self.guide_top.id
		)
		self.assertEqual(guide_top_earnings_entry["earnings"], 300.0)

		self.assertEqual(payload["top_agencies_by_bookings"][0]["id"], self.agency_top.id)
		self.assertEqual(payload["top_agencies_by_earnings"][0]["id"], self.agency_earner.id)
		self.assertEqual(payload["least_agencies_by_bookings"][0]["id"], self.agency_zero.id)
		self.assertEqual(payload["least_agencies_by_earnings"][0]["id"], self.agency_zero.id)

	def test_partner_rankings_reject_invalid_timeframe(self):
		self.client.force_authenticate(user=self.admin)
		response = self.client.get(reverse("admin-partner-rankings"), {"timeframe": "Quarterly"})
		self.assertEqual(response.status_code, 400)
		self.assertIn("timeframe", response.json())
