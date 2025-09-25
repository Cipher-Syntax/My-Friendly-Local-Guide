from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'is_tourist', 'is_local_guide', 'guide_approved', 'profile_picture', 'bio', 'phone_number', 'location']
        extra_kwargs = {'password': {'write_only': True}}

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('That username already exists')
        
    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user