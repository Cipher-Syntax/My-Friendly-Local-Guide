from rest_framework import generics, permissions #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.exceptions import NotFound #type: ignore
from django.db.models import Q
from django.contrib.auth import get_user_model
from .models import Message
from .serializers import MessageSerializer
from system_management_module.models import SystemAlert

User = get_user_model()

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
        
        data = [{
            'id': p.id,
            'username': p.username,
            'full_name': p.get_full_name(),
        } for p in partners]
        
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

        serializer.save(sender=user, receiver=receiver)
        
        SystemAlert.objects.create(
            recipient=receiver,
            title="New Message",
            message=f"You have a new message from {user.get_full_name()}",
            related_model='User',
            related_object_id=user.id
        )