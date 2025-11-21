from rest_framework import serializers #type: ignore
from .models import Message
from django.contrib.auth import get_user_model

User = get_user_model()

class MessageSerializer(serializers.ModelSerializer):
    """
    Serializer used for sending and retrieving individual messages.
    """
    
    # Read-only fields for display in the chat interface
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    receiver_id = serializers.PrimaryKeyRelatedField(source='receiver', read_only=True)
    
    # These primary key fields must be explicitly defined, but 'sender' will be read-only
    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    receiver = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'receiver', 'receiver_id', 
            'sender_username', 
            'content', 'timestamp', 'is_read'
        ]
        # 'sender' is handled by the view, the rest are auto-generated/managed
        read_only_fields = ['timestamp', 'is_read', 'sender']

    def validate(self, data):
        request = self.context.get('request')
        sender = request.user if request else None
        receiver = data.get('receiver')
        
        # Validation 1: Sender and receiver must be different (retaining your logic)
        if sender and receiver and sender.pk == receiver.pk:
            raise serializers.ValidationError({"receiver": "Sender and receiver cannot be the same user."})
            
        # Validation 2: Ensure content is not empty
        if not data.get('content') or not data.get('content').strip():
            raise serializers.ValidationError({'content': 'Content cannot be empty.'})

        return data