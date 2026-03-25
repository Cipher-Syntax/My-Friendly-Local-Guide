from rest_framework import generics, permissions #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import NotFound, ValidationError #type: ignore
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Message
from .serializers import MessageSerializer

User = get_user_model()


def _display_name_for_user(user):
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

class ConversationListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        user = request.user
        
        partners_raw = Message.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).values_list('sender', 'receiver').distinct()
        
        partner_ids = set()
        for s, r in partners_raw:
            if s != user.id:
                partner_ids.add(s)
            if r != user.id:
                partner_ids.add(r)
                
        partners = User.objects.filter(id__in=partner_ids)

        data = []
        for partner in partners:
            thread = Message.objects.filter(
                Q(sender=user, receiver=partner) | Q(sender=partner, receiver=user)
            )
            latest = thread.order_by('-timestamp').first()
            unread_count = Message.objects.filter(
                sender=partner,
                receiver=user,
                is_read=False,
            ).count()

            data.append({
                'id': partner.id,
                'username': partner.username,
                'full_name': partner.get_full_name(),
                'display_name': _display_name_for_user(partner),
                'profile_picture': getattr(partner, 'profile_picture', None),
                'last_message': latest.content if latest else '',
                'last_message_timestamp': latest.timestamp if latest else None,
                'last_message_ts': latest.timestamp.timestamp() if latest else 0,
                'unread_count': unread_count,
            })

        data.sort(
            key=lambda item: item.get('last_message_ts') or 0,
            reverse=True,
        )
        
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
            Q(sender=user.id, receiver=partner_id) | 
            Q(sender=partner_id, receiver=user.id)
        ).order_by('timestamp')
        
        Message.objects.filter(receiver=user.id, sender=partner_id, is_read=False).update(is_read=True)
        
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