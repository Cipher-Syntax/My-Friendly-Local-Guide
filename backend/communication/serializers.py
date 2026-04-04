from rest_framework import serializers #type: ignore
from django.core.exceptions import ObjectDoesNotExist
from .models import Message
from django.contrib.auth import get_user_model

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

    return username or 'User'

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_display_name = serializers.SerializerMethodField()
    receiver_id = serializers.PrimaryKeyRelatedField(source='receiver', read_only=True)
    
    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    receiver = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'receiver', 'receiver_id', 
            'sender_username', 'sender_display_name',
            'content', 'timestamp', 'is_read'
        ]
        read_only_fields = ['timestamp', 'is_read', 'sender']

    def get_sender_display_name(self, obj):
        return _display_name_for_user(obj.sender)

    def validate(self, data):
        request = self.context.get('request')
        sender = request.user if request else None
        receiver = data.get('receiver')
        
        if sender and receiver and sender.pk == receiver.pk:
            raise serializers.ValidationError({"receiver": "Sender and receiver cannot be the same user."})
            
        if not data.get('content') or not data.get('content').strip():
            raise serializers.ValidationError({'content': 'Content cannot be empty.'})

        return data