from rest_framework import serializers #type: ignore
from .models import Destination, DestinationImage, Attraction, TourPackage, TourStop
from django.contrib.auth import get_user_model
import json

User = get_user_model()


class DestinationImageSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = DestinationImage
        fields = ['id', 'image', 'caption']

    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

class AttractionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attraction
        fields = ['id', 'name', 'description', 'photo']

class DestinationSerializer(serializers.ModelSerializer):
    images = DestinationImageSerializer(many=True, read_only=True)
    attractions = AttractionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Destination
        fields = [
            'id', 'name', 'description', 'category', 'location', 
            'latitude', 'longitude', 'average_rating', 
            'images', 'attractions', 'is_featured'
        ]
        read_only_fields = ['average_rating']

class DestinationListSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    
    images = DestinationImageSerializer(many=True, read_only=True)
    attractions = AttractionSerializer(many=True, read_only=True)

    class Meta:
        model = Destination
        fields = [
            'id', 'name', 'location', 'description', 'category', 
            'average_rating', 'image', 
            'images',       
            'attractions',  
            'is_featured'   
        ]
        read_only_fields = ['average_rating']

    def get_image(self, obj):
        first_img = obj.images.first()
        if first_img and first_img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_img.image.url)
        return None

class TourStopSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = TourStop
        fields = ['id', 'name', 'image', 'order']
    
    def get_image(self, obj):
        request = self.context.get('request')
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None

class TourPackageSerializer(serializers.ModelSerializer):
    stops = TourStopSerializer(many=True, read_only=True)
    guide_name = serializers.CharField(source='guide.get_full_name', read_only=True)
    guide_avatar = serializers.SerializerMethodField()
    destination_name = serializers.CharField(source='main_destination.name', read_only=True)

    stops_images = serializers.ListField(child=serializers.ImageField(), write_only=True, required=False)
    stops_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    destination_id = serializers.PrimaryKeyRelatedField(queryset=Destination.objects.all(), source='main_destination', write_only=True)

    class Meta:
        model = TourPackage
        fields = [
            'id', 'guide', 'guide_name', 'guide_avatar',
            'destination_id', 'main_destination', 'destination_name',
            'name', 'description', 'duration', 'max_group_size', 'what_to_bring',
            'price_per_day', 'solo_price', 'additional_fee_per_head',
            'itinerary_timeline',
            'stops', 'stops_images', 'stops_names',
            'created_at'
        ]
        read_only_fields = ['guide', 'created_at', 'main_destination']

    def get_guide_avatar(self, obj):
        if obj.guide.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.guide.profile_picture.url)
        return None

    def create(self, validated_data):
        stops_images = validated_data.pop('stops_images', [])
        stops_names = validated_data.pop('stops_names', [])
        
        itinerary_raw = validated_data.get('itinerary_timeline', [])
        if isinstance(itinerary_raw, str):
            validated_data['itinerary_timeline'] = json.loads(itinerary_raw)

        tour = TourPackage.objects.create(**validated_data)

        for index, image in enumerate(stops_images):
            name = stops_names[index] if index < len(stops_names) else f"Stop {index + 1}"
            TourStop.objects.create(
                tour=tour,
                name=name,
                image=image,
                order=index
            )

        return tour


class GuideSerializer(serializers.ModelSerializer):
    tours = serializers.SerializerMethodField()
    guide_name = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'guide_name',
            'location', 'guide_rating', 'available_days', 
            'languages', 'specialty', 'experience_years', 
            'price_per_day', 'profile_picture', 'tours',
            'is_guide_visible'
        ]
        read_only_fields = ['id', 'tours', 'guide_rating']
    
    def get_guide_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    
    def get_tours(self, obj):
        """Return only tours for the requested destination"""
        request = self.context.get('request')
        destination_id = request.query_params.get('main_destination') if request else None
        
        if destination_id:
            tours = obj.tours.filter(main_destination__id=destination_id)
        else:
            tours = obj.tours.all()
        
        return TourPackageSerializer(tours, many=True, context=self.context).data