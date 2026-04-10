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

	def test_delete_conversation_hides_only_for_request_user(self):
		Message.objects.create(sender=self.user, receiver=self.partner, content="Hi")
		Message.objects.create(sender=self.partner, receiver=self.user, content="Hello")

		self.client.force_authenticate(user=self.user)
		delete_response = self.client.delete(
			reverse("conversation-delete", kwargs={"partner_id": self.partner.id})
		)
		self.assertEqual(delete_response.status_code, 200)

		my_list_response = self.client.get(reverse("conversation-list"))
		self.assertEqual(my_list_response.status_code, 200)
		my_partner_ids = [item.get("id") for item in my_list_response.data]
		self.assertNotIn(self.partner.id, my_partner_ids)

		self.client.force_authenticate(user=self.partner)
		partner_list_response = self.client.get(reverse("conversation-list"))
		self.assertEqual(partner_list_response.status_code, 200)
		partner_ids = [item.get("id") for item in partner_list_response.data]
		self.assertIn(self.user.id, partner_ids)

	def test_delete_single_message_hides_only_for_request_user(self):
		message = Message.objects.create(sender=self.user, receiver=self.partner, content="Delete me")

		self.client.force_authenticate(user=self.user)
		delete_response = self.client.delete(
			reverse("message-delete", kwargs={"message_id": message.id})
		)
		self.assertEqual(delete_response.status_code, 200)

		my_thread = self.client.get(reverse("message-thread", kwargs={"partner_id": self.partner.id}))
		self.assertEqual(my_thread.status_code, 200)
		self.assertEqual(len(my_thread.data), 0)

		self.client.force_authenticate(user=self.partner)
		partner_thread = self.client.get(reverse("message-thread", kwargs={"partner_id": self.user.id}))
		self.assertEqual(partner_thread.status_code, 200)
		self.assertEqual(len(partner_thread.data), 1)
		self.assertEqual(partner_thread.data[0].get("id"), message.id)

	def test_sender_can_delete_message_for_everyone(self):
		message = Message.objects.create(sender=self.user, receiver=self.partner, content="Global delete")

		self.client.force_authenticate(user=self.user)
		delete_response = self.client.delete(
			reverse("message-delete", kwargs={"message_id": message.id}) + "?scope=everyone"
		)
		self.assertEqual(delete_response.status_code, 200)

		my_thread = self.client.get(reverse("message-thread", kwargs={"partner_id": self.partner.id}))
		self.assertEqual(my_thread.status_code, 200)
		self.assertEqual(len(my_thread.data), 0)

		self.client.force_authenticate(user=self.partner)
		partner_thread = self.client.get(reverse("message-thread", kwargs={"partner_id": self.user.id}))
		self.assertEqual(partner_thread.status_code, 200)
		self.assertEqual(len(partner_thread.data), 0)

	def test_receiver_cannot_delete_message_for_everyone(self):
		message = Message.objects.create(sender=self.user, receiver=self.partner, content="Not allowed")

		self.client.force_authenticate(user=self.partner)
		delete_response = self.client.delete(
			reverse("message-delete", kwargs={"message_id": message.id}) + "?scope=everyone"
		)
		self.assertEqual(delete_response.status_code, 400)

		self.client.force_authenticate(user=self.user)
		sender_thread = self.client.get(reverse("message-thread", kwargs={"partner_id": self.partner.id}))
		self.assertEqual(sender_thread.status_code, 200)
		self.assertEqual(len(sender_thread.data), 1)

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

	def test_agency_business_name_is_used_as_display_name_in_chat(self):
		tourist = User.objects.create_user(username="tourist_display", password="Pass12345")
		agency_user = User.objects.create_user(
			username="agency_owner_display",
			password="Pass12345",
			first_name="Owner",
			last_name="Display",
		)
		Agency.objects.create(
			user=agency_user,
			business_name="Blue Harbor Travels",
			owner_name="Owner Display",
			email="blueharbor@example.com",
		)

		Message.objects.create(sender=agency_user, receiver=tourist, content="Welcome to our agency!")

		self.client.force_authenticate(user=tourist)
		list_response = self.client.get(reverse("conversation-list"))
		self.assertEqual(list_response.status_code, 200)

		agency_conversation = next((item for item in list_response.data if item.get("id") == agency_user.id), None)
		self.assertIsNotNone(agency_conversation)
		self.assertEqual(agency_conversation.get("display_name"), "Blue Harbor Travels")

		thread_response = self.client.get(reverse("message-thread", kwargs={"partner_id": agency_user.id}))
		self.assertEqual(thread_response.status_code, 200)
		self.assertTrue(len(thread_response.data) > 0)
		self.assertEqual(thread_response.data[0].get("sender_display_name"), "Blue Harbor Travels")
