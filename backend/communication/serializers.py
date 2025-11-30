from rest_framework import serializers #type: ignore
from .models import Message
from django.contrib.auth import get_user_model

User = get_user_model()

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    receiver_id = serializers.PrimaryKeyRelatedField(source='receiver', read_only=True)
    
    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    receiver = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'receiver', 'receiver_id', 
            'sender_username', 
            'content', 'timestamp', 'is_read'
        ]
        read_only_fields = ['timestamp', 'is_read', 'sender']

    def validate(self, data):
        request = self.context.get('request')
        sender = request.user if request else None
        receiver = data.get('receiver')
        
        if sender and receiver and sender.pk == receiver.pk:
            raise serializers.ValidationError({"receiver": "Sender and receiver cannot be the same user."})
            
        if not data.get('content') or not data.get('content').strip():
            raise serializers.ValidationError({'content': 'Content cannot be empty.'})

        return data