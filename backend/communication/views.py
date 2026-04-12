from rest_framework import generics, permissions, status #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import NotFound, ValidationError #type: ignore
from rest_framework.decorators import api_view, permission_classes #type: ignore
from rest_framework.permissions import IsAuthenticated, AllowAny #type: ignore
from rest_framework.views import APIView #type: ignore
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.conf import settings
from system_management_module.services.email_preferences import send_preference_aware_email
from .models import Message
from .serializers import MessageSerializer
from backend.pagination import OptionalPageNumberPagination

User = get_user_model()


def _display_name_for_user(user):
    try:
        agency_profile = user.agency_profile
        business_name = (getattr(agency_profile, 'business_name', '') or '').strip()
        if business_name:
            return business_name
    except (AttributeError, ObjectDoesNotExist):
        pass

    full_name = (user.get_full_name() or '').strip()
    if full_name:
        return full_name

    username = (user.username or '').strip()
    if '@' in username:
        local = username.split('@', 1)[0].replace('.', ' ').replace('_', ' ').replace('-', ' ').strip()
        if local:
            return ' '.join(part.capitalize() for part in local.split())

    if username:
        return username

    return 'User'


def _safe_profile_picture_value(user):
    image = None
    try:
        agency_profile = user.agency_profile
        logo = getattr(agency_profile, 'logo', None)
        if logo:
            image = logo
    except (AttributeError, ObjectDoesNotExist):
        pass

    if not image:
        image = getattr(user, 'profile_picture', None)

    if not image:
        return None

    try:
        url = image.url
        return str(url) if url else None
    except Exception:
        pass

    try:
        name = getattr(image, 'name', None)
        return str(name) if name else None
    except Exception:
        return None


def _messages_visible_to_user(user):
    return Message.objects.filter(
        (Q(sender=user) & Q(deleted_by_sender=False)) |
        (Q(receiver=user) & Q(deleted_by_receiver=False))
    )

class ConversationListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OptionalPageNumberPagination

    def list(self, request, *args, **kwargs):
        user = request.user

        visible_messages = _messages_visible_to_user(user)

        partners_raw = visible_messages.values_list('sender', 'receiver').distinct()
        
        partner_ids = set()
        for s, r in partners_raw:
            if s != user.id:
                partner_ids.add(s)
            if r != user.id:
                partner_ids.add(r)
                
        partners = User.objects.filter(id__in=partner_ids).select_related('agency_profile')

        data = []
        for partner in partners:
            thread = visible_messages.filter(
                Q(sender=user, receiver=partner) |
                Q(sender=partner, receiver=user)
            )
            latest = thread.order_by('-timestamp').first()
            unread_count = Message.objects.filter(
                sender=partner,
                receiver=user,
                is_read=False,
                deleted_by_receiver=False,
            ).count()

            if not latest:
                continue

            data.append({
                'id': partner.id,
                'username': partner.username,
                'full_name': partner.get_full_name(),
                'display_name': _display_name_for_user(partner),
                'profile_picture': _safe_profile_picture_value(partner),
                'last_message': latest.content if latest else '',
                'last_message_timestamp': latest.timestamp if latest else None,
                'last_message_ts': latest.timestamp.timestamp() if latest else 0,
                'unread_count': unread_count,
            })

        data.sort(
            key=lambda item: item.get('last_message_ts') or 0,
            reverse=True,
        )

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(data, request, view=self)
        if page is not None:
            return paginator.get_paginated_response(page)

        return Response(data)


class MessageThreadView(generics.ListCreateAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        partner_id = self.kwargs.get('partner_id')
        
        if not partner_id:
            return Message.objects.none()

        queryset = Message.objects.filter(
            (Q(sender=user.id, receiver=partner_id) & Q(deleted_by_sender=False)) |
            (Q(sender=partner_id, receiver=user.id) & Q(deleted_by_receiver=False))
        ).order_by('timestamp')
        
        Message.objects.filter(
            receiver=user.id,
            sender=partner_id,
            is_read=False,
            deleted_by_receiver=False,
        ).update(is_read=True)
        
        return queryset

    def perform_create(self, serializer):
        user = self.request.user
        partner_id = self.kwargs.get('partner_id')
        
        try:
            receiver = User.objects.get(pk=partner_id)
        except User.DoesNotExist:
            raise NotFound({"detail": "Receiver user not found."})

        if receiver.id == user.id:
            raise ValidationError({"detail": "You cannot send a message to your own account."})

        serializer.save(sender=user, receiver=receiver)


class ConversationDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, partner_id):
        user = request.user

        if user.id == partner_id:
            raise ValidationError({"detail": "You cannot delete a self-conversation."})

        if not User.objects.filter(pk=partner_id).exists():
            raise NotFound({"detail": "Conversation partner not found."})

        hidden_from_sender = Message.objects.filter(
            sender=user.id,
            receiver=partner_id,
            deleted_by_sender=False,
        ).update(deleted_by_sender=True)

        hidden_from_receiver = Message.objects.filter(
            sender=partner_id,
            receiver=user.id,
            deleted_by_receiver=False,
        ).update(deleted_by_receiver=True)

        hidden_messages = hidden_from_sender + hidden_from_receiver

        return Response(
            {
                "detail": "Conversation removed from your view only.",
                "hidden_messages": hidden_messages,
            },
            status=status.HTTP_200_OK,
        )


class MessageDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, message_id):
        user = request.user
        scope = str(request.query_params.get('scope', 'me') or 'me').strip().lower()

        if scope not in {'me', 'everyone'}:
            raise ValidationError({"detail": "Invalid scope. Use 'me' or 'everyone'."})

        try:
            message = Message.objects.get(pk=message_id)
        except Message.DoesNotExist:
            raise NotFound({"detail": "Message not found."})

        if message.sender_id != user.id and message.receiver_id != user.id:
            raise NotFound({"detail": "Message not found."})

        if scope == 'everyone':
            if message.sender_id != user.id:
                raise ValidationError({"detail": "Only the sender can delete for everyone."})

            changed = False
            if not message.deleted_by_sender:
                message.deleted_by_sender = True
                changed = True
            if not message.deleted_by_receiver:
                message.deleted_by_receiver = True
                changed = True

            if changed:
                message.save(update_fields=['deleted_by_sender', 'deleted_by_receiver'])

            return Response(
                {
                    "detail": "Message removed for everyone.",
                    "scope": "everyone",
                },
                status=status.HTTP_200_OK,
            )

        update_fields = []

        if message.sender_id == user.id and not message.deleted_by_sender:
            message.deleted_by_sender = True
            update_fields.append('deleted_by_sender')

        if message.receiver_id == user.id and not message.deleted_by_receiver:
            message.deleted_by_receiver = True
            update_fields.append('deleted_by_receiver')

        if update_fields:
            message.save(update_fields=update_fields)

        return Response(
            {
                "detail": "Message removed from your view only.",
                "scope": "me",
            },
            status=status.HTTP_200_OK,
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def send_support_email(request):
    message = request.data.get('message')

    if not message:
        return Response({'error': 'Message is required'}, status=status.HTTP_400_BAD_REQUEST)

    provided_email = request.data.get('email')
    provided_name = request.data.get('name')

    if provided_email:
        first_name = provided_name or "Anonymous Web User"
        last_name = ""
        sender_email = provided_email
        phone = "N/A (Web Form)"
        user_type = "Public Web Visitor"
        
    elif request.user and request.user.is_authenticated:
        user = request.user
        first_name = user.first_name
        last_name = user.last_name
        sender_email = user.email
        phone = getattr(user, 'phone_number', 'Not provided')
        user_type = "Authenticated App User"
        
    else:
        return Response({'error': 'Email is required for web inquiries'}, status=status.HTTP_400_BAD_REQUEST)

    admin_subject = f"Support Request from {first_name} {last_name}".strip()
    admin_plain_message = f"User Type: {user_type}\nName: {first_name} {last_name}\nEmail: {sender_email}\nPhone: {phone}\n\nMessage:\n{message}"
    
    admin_html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }}
            .header {{ background-color: #0072FF; padding: 20px; text-align: center; color: #ffffff; font-size: 20px; font-weight: bold; }}
            .content {{ padding: 30px; line-height: 1.6; font-size: 16px; color: #475569; }}
            .highlight {{ font-weight: bold; color: #333; }}
            .message-box {{ background-color: #f1f5f9; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 15px; white-space: pre-wrap; color: #1e293b; }}
            .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">New Support Request</div>
            <div class="content">
                <p>A new support ticket has been submitted ({user_type}).</p>
                <ul>
                    <li><span class="highlight">Name:</span> {first_name} {last_name}</li>
                    <li><span class="highlight">Email:</span> {sender_email}</li>
                    <li><span class="highlight">Phone:</span> {phone}</li>
                </ul>
                <p class="highlight" style="margin-bottom: 5px;">Message Details:</p>
                <div class="message-box">{message}</div>
            </div>
            <div class="footer">&copy; 2026 LocaLynk Support System.</div>
        </div>
    </body>
    </html>
    """

    # 3. USER RECEIPT: The auto-reply that goes back to the USER
    user_subject = "We received your support request!"
    user_plain_message = f"Hi {first_name},\n\nWe have successfully received your support request regarding:\n\n\"{message}\"\n\nOur team will review this and get back to you shortly.\n\nThanks,\nLocaLynk Support Team"
    user_html_message = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: 'Poppins', Arial, sans-serif; background-color: #f8f9fa; margin: 0; padding: 40px 20px; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); overflow: hidden; }}
            .header {{ background-color: #10B981; padding: 20px; text-align: center; color: #ffffff; font-size: 20px; font-weight: bold; }}
            .content {{ padding: 30px; line-height: 1.6; font-size: 16px; color: #475569; }}
            .message-box {{ background-color: #f1f5f9; padding: 15px; border-radius: 8px; border-left: 4px solid #10B981; margin-top: 15px; font-style: italic; color: #64748b; }}
            .footer {{ padding: 20px; text-align: center; color: #94a3b8; font-size: 14px; background-color: #f1f5f9; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">We're on it!</div>
            <div class="content">
                <p>Hi <b>{first_name}</b>,</p>
                <p>Thanks for reaching out! We have successfully received your support request. One of our team members will review your message and get back to you as soon as possible.</p>
                <p>For your records, here is a copy of your message:</p>
                <div class="message-box">"{message}"</div>
                <p>Hang tight!</p>
                <p><b>The Support Team</b></p>
            </div>
            <div class="footer">&copy; 2026 LocaLynk. All rights reserved.</div>
        </div>
    </body>
    </html>
    """

    try:
        # Send to Admin
        send_mail(
            subject=admin_subject,
            message=admin_plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.ADMIN_SUPPORT], 
            fail_silently=False,
            html_message=admin_html_message
        )
        
        # Send to User (Mobile OR Web)
        send_preference_aware_email(
            subject=user_subject,
            message=user_plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[sender_email],
            fail_silently=True, 
            html_message=user_html_message
        )

        return Response({'message': 'Support emails sent successfully'}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)