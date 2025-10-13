from rest_framework import serializers #type: ignore
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, required=True, min_length=8)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'confirm_password',
            'first_name', 'last_name',
            'is_tourist', 'is_local_guide', 'guide_approved',
            'profile_picture', 'bio', 'phone_number', 'location',
            'date_joined'
        ]
        read_only_fields = ('guide_approved', 'date_joined')
        
    def validate_username(self, value):
        queryset = User.objects.filter(username=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Username already exists')
        return value
    
    def validate_email(self, value):
        queryset = User.objects.filter(email=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('Email already exists')
        return value
    
    def validate(self, data):
        if data.get('password') != data.get('confirm_password'):
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
    
    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        validated_data.pop('confirm_password', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if password:
            instance.set_password(password)

        instance.save()
        return instance
    
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user associated with this email.")
        return value

class PasswordResetConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match.'})
        return data

    def save(self, user):
        password = self.validated_data['password']
        user.set_password(password)
        user.save()
        return user



    # def validate_username(self, value):
    #     queryset = User.objects.filter(username=value)
    #     if self.instance:
    #         queryset = queryset.exclude(pk=self.instance.pk)
    #     if queryset.exists():
    #         raise serializers.ValidationError("That username already exists")
    #     return value

    # def create(self, validated_data):
    #     password = validated_data.pop('password', None)
    #     user = User(**validated_data)
    #     if password:
    #         user.set_password(password)
    #     user.save()
    #     return user

    # def update(self, instance, validated_data):
    #     password = validated_data.pop('password', None)
    #     for attr, val in validated_data.items():
    #         setattr(instance, attr, val)
    #     if password:
    #         instance.set_password(password)
    #     instance.save()
    #     return instance
