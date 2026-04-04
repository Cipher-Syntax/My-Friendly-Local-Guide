from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from agency_management_module.models import Agency
from .models import Message
from .serializers import MessageSerializer

User = get_user_model()


class CommunicationModelTests(TestCase):
	def test_message_string_representation(self):
		sender = User.objects.create_user(username="sender", password="Pass12345")
		receiver = User.objects.create_user(username="receiver", password="Pass12345")
		message = Message.objects.create(sender=sender, receiver=receiver, content="Hello")

		self.assertEqual(str(message), "Msg from sender")


class CommunicationSerializerTests(TestCase):
	def setUp(self):
		self.sender = User.objects.create_user(username="s1", password="Pass12345")
		self.receiver = User.objects.create_user(username="r1", password="Pass12345")

	def test_message_serializer_rejects_empty_content(self):
		class DummyRequest:
			user = self.sender

		serializer = MessageSerializer(data={"content": "   "}, context={"request": DummyRequest()})
		self.assertFalse(serializer.is_valid())
		self.assertIn("content", serializer.errors)


class CommunicationApiTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(username="chat_user", password="Pass12345")
		self.partner = User.objects.create_user(username="chat_partner", password="Pass12345")

	def test_conversation_list_requires_authentication(self):
		response = self.client.get(reverse("conversation-list"))
		self.assertEqual(response.status_code, 401)

	def test_message_thread_post_success(self):
		self.client.force_authenticate(user=self.user)
		response = self.client.post(
			reverse("message-thread", kwargs={"partner_id": self.partner.id}),
			{"content": "Hi there"},
			format="json",
		)
		self.assertEqual(response.status_code, 201)
		self.assertEqual(Message.objects.count(), 1)

	def test_get_thread_marks_received_messages_as_read(self):
		Message.objects.create(sender=self.partner, receiver=self.user, content="Unread", is_read=False)
		self.client.force_authenticate(user=self.user)

		response = self.client.get(reverse("message-thread", kwargs={"partner_id": self.partner.id}))
		self.assertEqual(response.status_code, 200)
		self.assertTrue(Message.objects.get().is_read)

	def test_tourist_and_agency_can_exchange_messages(self):
		tourist = User.objects.create_user(username="tourist_user", password="Pass12345")
		agency_user = User.objects.create_user(username="agency_owner", password="Pass12345")
		Agency.objects.create(
			user=agency_user,
			business_name="Seaside Agency",
			owner_name="Owner Name",
			email="agency-owner@example.com",
		)

		self.client.force_authenticate(user=tourist)
		send_response = self.client.post(
			reverse("message-thread", kwargs={"partner_id": agency_user.id}),
			{"content": "Hello agency"},
			format="json",
		)
		self.assertEqual(send_response.status_code, 201)

		self.client.force_authenticate(user=agency_user)
		list_response = self.client.get(reverse("conversation-list"))
		self.assertEqual(list_response.status_code, 200)

		partner_ids = [item.get("id") for item in list_response.data]
		self.assertIn(tourist.id, partner_ids)
