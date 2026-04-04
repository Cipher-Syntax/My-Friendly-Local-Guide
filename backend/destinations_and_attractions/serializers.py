from rest_framework import serializers 
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
    
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(), write_only=True, required=False
    )
    
    existing_images = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )
    
    class Meta:
        model = Destination
        fields = [
            'id', 'name', 'description', 'category', 'location', 
            'latitude', 'longitude', 'average_rating', 
            'images', 'uploaded_images', 'existing_images', 'attractions', 'is_featured'
        ]
        read_only_fields = ['average_rating']

    def create(self, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        validated_data.pop('existing_images', []) 
        
        destination = Destination.objects.create(**validated_data)
        
        for image in uploaded_images:
            DestinationImage.objects.create(destination=destination, image=image)
            
        return destination
        
    def update(self, instance, validated_data):
        uploaded_images = validated_data.pop('uploaded_images', [])
        existing_images = validated_data.pop('existing_images', None)
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if existing_images is not None:
            for dest_image in instance.images.all():
                is_kept = any(dest_image.image.url in kept_url for kept_url in existing_images)
                if not is_kept:
                    dest_image.delete()
                    
        for image in uploaded_images:
            DestinationImage.objects.create(destination=instance, image=image)
            
        return instance

class DestinationListSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    images = DestinationImageSerializer(many=True, read_only=True)
    attractions = AttractionSerializer(many=True, read_only=True)

    class Meta:
        model = Destination
        fields = [
            'id', 'name', 'location', 'description', 'category', 
            'average_rating', 'image', 'images', 'attractions', 'is_featured'   
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
    
    agency_name = serializers.CharField(source='agency.business_name', read_only=True)
    agency_user_id = serializers.IntegerField(source='agency.user.id', read_only=True) # ADDED: Links to User ID

    destination_name = serializers.CharField(source='main_destination.name', read_only=True)
    destination_image = serializers.SerializerMethodField()

    stops_images = serializers.ListField(child=serializers.ImageField(), write_only=True, required=False)
    stops_names = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)
    existing_images_urls = serializers.ListField(child=serializers.CharField(allow_blank=True), write_only=True, required=False)
    destination_id = serializers.PrimaryKeyRelatedField(queryset=Destination.objects.all(), source='main_destination', write_only=True)

    class Meta:
        model = TourPackage
        fields = [
            'id', 'guide', 'guide_name', 'guide_avatar',
            'agency', 'agency_name', 'agency_user_id', # ADDED: agency_user_id
            'destination_id', 'main_destination', 'destination_name', 'destination_image',
            'name', 'description', 'duration', 'duration_days', 'max_group_size', 'what_to_bring',
            'price_per_day', 'solo_price', 'additional_fee_per_head',
            'itinerary_timeline',
            'stops', 'stops_images', 'stops_names', 'existing_images_urls',
            'created_at'
        ]
        read_only_fields = ['guide', 'agency', 'created_at', 'main_destination']

    def get_destination_image(self, obj):
        if obj.main_destination:
            first_img = obj.main_destination.images.first()
            if first_img and first_img.image:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(first_img.image.url)
                return first_img.image.url
        return None

    def get_guide_avatar(self, obj):
        if obj.guide and obj.guide.profile_picture:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.guide.profile_picture.url)
        return None

    def create(self, validated_data):
        request = self.context.get('request')
        stops_images = request.FILES.getlist('stops_images') if request else []
        stops_names = request.data.getlist('stops_names') if request else []
        existing_images_urls = request.data.getlist('existing_images_urls') if request else []
        
        validated_data.pop('stops_images', None)
        validated_data.pop('stops_names', None)
        validated_data.pop('existing_images_urls', None)
        
        itinerary_raw = validated_data.get('itinerary_timeline', [])
        if isinstance(itinerary_raw, str):
            try:
                validated_data['itinerary_timeline'] = json.loads(itinerary_raw)
            except json.JSONDecodeError:
                validated_data['itinerary_timeline'] = []

        tour = TourPackage.objects.create(**validated_data)

        img_file_index = 0
        for index, name in enumerate(stops_names):
            new_stop = TourStop(tour=tour, name=name, order=index)
            
            existing_url = existing_images_urls[index] if index < len(existing_images_urls) else ""
            if not existing_url and img_file_index < len(stops_images):
                new_stop.image = stops_images[img_file_index]
                img_file_index += 1
                
            new_stop.save()

        return tour

    def update(self, instance, validated_data):
        request = self.context.get('request')
        stops_images = request.FILES.getlist('stops_images') if request else []
        stops_names = request.data.getlist('stops_names') if request else []
        existing_images_urls = request.data.getlist('existing_images_urls') if request else []

        validated_data.pop('stops_images', None)
        validated_data.pop('stops_names', None)
        validated_data.pop('existing_images_urls', None)

        itinerary_raw = validated_data.get('itinerary_timeline', instance.itinerary_timeline)
        if isinstance(itinerary_raw, str):
            try:
                validated_data['itinerary_timeline'] = json.loads(itinerary_raw)
            except json.JSONDecodeError:
                pass

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if request and request.method in ['PUT', 'PATCH'] and 'stops_names' in request.data:
            old_stops = list(instance.stops.all())
            instance.stops.all().delete()
            
            img_file_index = 0
            for index, name in enumerate(stops_names):
                new_stop = TourStop(tour=instance, name=name, order=index)
                
                existing_url = existing_images_urls[index] if index < len(existing_images_urls) else ""
                
                if existing_url and existing_url.strip() != "":
                    for old in old_stops:
                        if old.image and old.image.url in existing_url:
                            new_stop.image = old.image
                            break
                else:
                    if img_file_index < len(stops_images):
                        new_stop.image = stops_images[img_file_index]
                        img_file_index += 1
                
                new_stop.save()

        return instance

class GuideSerializer(serializers.ModelSerializer):
    tours = serializers.SerializerMethodField()
    guide_name = serializers.SerializerMethodField()
    active_bookings_count = serializers.IntegerField(read_only=True)
    is_busy = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'first_name', 'last_name', 'guide_name',
            'location', 'guide_rating', 'available_days', 
            'languages', 'specialty', 'experience_years', 
            'price_per_day', 'profile_picture', 'tours',
            'is_guide_visible', 'guide_tier', 'booking_count',
            'active_bookings_count', 'is_busy'
        ]
        read_only_fields = ['id', 'tours', 'guide_rating']
    
    def get_guide_name(self, obj):
        return f"{obj.first_name} {obj.last_name}"
    
    def get_tours(self, obj):
        request = self.context.get('request')
        destination_id = request.query_params.get('main_destination') if request else None
        
        if destination_id:
            tours = obj.tours.filter(main_destination__id=destination_id)
        else:
            tours = obj.tours.all()
        
        return TourPackageSerializer(tours, many=True, context=self.context).data

    def get_is_busy(self, obj):
        tier = getattr(obj, 'guide_tier', 'free')
        active_count = getattr(obj, 'active_bookings_count', 0) or 0
        return tier != 'paid' and active_count >= 1