from rest_framework import serializers #type: ignore
from .models import Message
from user_authentication.models import User

class MessageSerializer(serializers.ModelSerializer):
    sender = serializers.PrimaryKeyRelatedField(read_only=True)
    receiver = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())

    class Meta:
        model = Message
        fields = ['id', 'sender', 'receiver', 'content', 'timestamp', 'is_read']
        read_only_fields = ['timestamp', 'is_read']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from user_authentication.models import User
        self.fields['receiver'].queryset = User.objects.all()

    def validate(self, data):
        request = self.context.get('request')
        sender = request.user if request else None
        receiver = data.get('receiver')
        if sender and receiver and sender.pk == receiver.pk:
            raise serializers.ValidationError("Sender and receiver cannot be the same user")
        return data
