from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

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
