from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from system_management_module.models import SystemAlert

from .models import Report
from .serializers import ReportSerializer

User = get_user_model()


class ReportModelTests(TestCase):
	def test_report_string_representation(self):
		reporter = User.objects.create_user(username="rep1", password="Pass12345")
		reported = User.objects.create_user(username="rep2", password="Pass12345")
		report = Report.objects.create(reporter=reporter, reported_user=reported, reason="Spam")
		self.assertIn("rep2", str(report))


class ReportSerializerTests(TestCase):
	def setUp(self):
		self.reporter = User.objects.create_user(username="srep", password="Pass12345")
		self.other = User.objects.create_user(username="other", password="Pass12345")

	def test_cannot_report_self(self):
		class DummyRequest:
			user = self.reporter

		serializer = ReportSerializer(
			data={"reported_user": self.reporter.id, "reason": "Bad"},
			context={"request": DummyRequest()},
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("reported_user", serializer.errors)

	def test_reason_is_required(self):
		class DummyRequest:
			user = self.reporter

		serializer = ReportSerializer(
			data={"reported_user": self.other.id, "reason": "   "},
			context={"request": DummyRequest()},
		)
		self.assertFalse(serializer.is_valid())
		self.assertIn("reason", serializer.errors)


class ReportApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.reporter = User.objects.create_user(username="api_rep", password="Pass12345")
		self.reported = User.objects.create_user(username="api_target", password="Pass12345")
		self.admin = User.objects.create_user(username="admin_rep", password="Pass12345", is_staff=True)

	def test_submit_requires_authentication(self):
		response = self.client.post(reverse("report-submit"), {}, format="json")
		self.assertEqual(response.status_code, 401)

	def test_authenticated_user_can_submit_report(self):
		self.client.force_authenticate(user=self.reporter)
		response = self.client.post(
			reverse("report-submit"),
			{"reported_user": self.reported.id, "reason": "Offensive behavior"},
			format="json",
		)
		self.assertEqual(response.status_code, 201)
		self.assertEqual(Report.objects.count(), 1)

	@patch("report.views.send_push_to_user")
	def test_admin_can_send_warning(self, _mock_push):
		report = Report.objects.create(
			reporter=self.reporter,
			reported_user=self.reported,
			reason="Abuse",
		)
		self.client.force_authenticate(user=self.admin)

		response = self.client.post(
			reverse("report-review-warn", args=[report.id]),
			{"message": "Final warning."},
			format="json",
		)
		self.assertEqual(response.status_code, 200)
		self.assertTrue(SystemAlert.objects.filter(recipient=self.reported, related_model="Report").exists())
