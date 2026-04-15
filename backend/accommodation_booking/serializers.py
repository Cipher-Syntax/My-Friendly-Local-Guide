from rest_framework import serializers 
from .models import Accommodation, Booking, BookingJourneyCheckpoint
from destinations_and_attractions.models import Destination, TourPackage
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from django.utils import timezone
import json

from agency_management_module.models import TouristGuide
from backend.location_policy import validate_zds_location_payload

User = get_user_model()

class SimpleUserSerializer(serializers.ModelSerializer):
    agency_phone = serializers.CharField(source='agency_profile.phone', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 
            'profile_picture', 'is_local_guide', 'is_staff', 
            'phone_number', 'agency_phone', 'valid_id_image'
        ]

class SimpleDestinationSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()

    class Meta:
        model = Destination
        fields = ['id', 'name', 'category', 'image']

    def get_image(self, obj):
        first_img = obj.images.first() 
        if first_img and first_img.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(first_img.image.url)
            return first_img.image.url
        return None

class AccommodationSerializer(serializers.ModelSerializer):
    host_id = serializers.PrimaryKeyRelatedField(source='host', read_only=True)
    host_username = serializers.CharField(source='host.username', read_only=True)
    host_full_name = serializers.CharField(source='host.get_full_name', read_only=True)
    
    agency_id = serializers.PrimaryKeyRelatedField(source='agency', read_only=True)
    agency_name = serializers.CharField(source='agency.business_name', read_only=True)
    agency_user_id = serializers.IntegerField(source='agency.user.id', read_only=True) 
    
    destination_detail = SimpleDestinationSerializer(source='destination', read_only=True)

    class Meta:
        model = Accommodation
        fields = [
            'id', 'host_id', 'host_username', 'host_full_name',
            'agency_id', 'agency_name', 'agency_user_id', 
            'title', 'description', 'location', 'municipality', 'latitude', 'longitude', 'price', 'photo',
            'accommodation_type', 'room_type', 'amenities',
            'offer_transportation', 'vehicle_type', 'transport_capacity',
            'transport_image', 'room_image',
            'destination', 'destination_detail',
            'is_approved', 'average_rating', 'created_at'
        ]
        read_only_fields = ['is_approved', 'average_rating', 'created_at', 'destination_detail']
        extra_kwargs = {
            'destination': {'write_only': True, 'required': False}
        }

    def create(self, validated_data):
        amenities_data = validated_data.get('amenities')
        if isinstance(amenities_data, str):
            try:
                validated_data['amenities'] = json.loads(amenities_data)
            except json.JSONDecodeError:
                validated_data['amenities'] = {}
        return super().create(validated_data)

    def validate(self, attrs):
        location = attrs.get('location', getattr(self.instance, 'location', None))
        municipality = attrs.get('municipality', getattr(self.instance, 'municipality', None))
        latitude = attrs.get('latitude', getattr(self.instance, 'latitude', None))
        longitude = attrs.get('longitude', getattr(self.instance, 'longitude', None))

        try:
            normalized = validate_zds_location_payload(
                location=location,
                latitude=latitude,
                longitude=longitude,
                municipality=municipality,
                require_location=True,
            )
        except ValueError as exc:
            raise serializers.ValidationError({'location': str(exc)})

        attrs['location'] = normalized['location']
        attrs['municipality'] = normalized['municipality'] or None
        attrs['latitude'] = normalized['latitude']
        attrs['longitude'] = normalized['longitude']
        return attrs

class BookingSerializer(serializers.ModelSerializer):
    tourist_id = serializers.PrimaryKeyRelatedField(source='tourist', read_only=True)
    tourist_username = serializers.CharField(source='tourist.username', read_only=True)
    
    # NEW: Expose the full tourist details
    tourist_detail = serializers.SerializerMethodField(read_only=True)

    accommodation_detail = AccommodationSerializer(source='accommodation', read_only=True)
    guide_detail = serializers.SerializerMethodField(read_only=True)
    agency_detail = serializers.SerializerMethodField(read_only=True)
    provider_payout_account = serializers.SerializerMethodField(read_only=True)
    destination_detail = SimpleDestinationSerializer(source='destination', read_only=True)
    tour_package_detail = serializers.SerializerMethodField(read_only=True)
    refund_status = serializers.SerializerMethodField(read_only=True)
    payout_processed_by_detail = serializers.SerializerMethodField(read_only=True)
    
    assigned_guides_detail = serializers.SerializerMethodField(read_only=True)
    assigned_agency_guides_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'tourist_id', 'tourist_username', 'tourist_detail', # ADDED tourist_detail
            'accommodation', 'guide', 'agency', 'destination', 'tour_package',
            'accommodation_detail', 'guide_detail', 'agency_detail', 'provider_payout_account', 'destination_detail', 'tour_package_detail',
            'assigned_guides', 'assigned_guides_detail',
            'assigned_agency_guides', 'assigned_agency_guides_detail',

            'check_in', 'check_out', 'num_guests', 'additional_guest_names',
            'tourist_valid_id_image', 'tourist_selfie_image', 
            
            'total_price', 'down_payment', 'balance_due',
            'downpayment_paid_at', 'balance_paid_at',
            
            'platform_fee', 'guide_payout_amount', 'is_payout_settled',
            'payout_settled_at', 'payout_channel', 'payout_reference_id', 'payout_processed_by', 'payout_processed_by_detail',
            
            'meetup_location', 'meetup_municipality', 'meetup_latitude', 'meetup_longitude', 'meetup_time', 'meetup_instructions',
            
            'status', 'refund_status', 'created_at'
        ]
        
        read_only_fields = [
            'status', 'created_at', 
            'total_price', 'down_payment', 'balance_due', 
            'downpayment_paid_at', 'balance_paid_at', 
            'platform_fee', 'guide_payout_amount',
            'is_payout_settled', 'payout_settled_at', 'payout_channel', 'payout_reference_id', 'payout_processed_by',
            'assigned_guides', 'assigned_agency_guides', 'destination_detail', 'tour_package',
            'meetup_location', 'meetup_municipality', 'meetup_latitude', 'meetup_longitude', 'meetup_time', 'meetup_instructions' 
        ]

    def validate_additional_guest_names(self, value):
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return []
        return value

    # NEW: Fetch the tourist details using the SimpleUserSerializer
    def get_tourist_detail(self, obj):
        if obj.tourist:
            return SimpleUserSerializer(obj.tourist, context=self.context).data
        return None

    def get_guide_detail(self, obj):
        if obj.guide:
            return SimpleUserSerializer(obj.guide, context=self.context).data
        return None

    def get_agency_detail(self, obj):
        if obj.agency:
            data = SimpleUserSerializer(obj.agency, context=self.context).data
            agency_profile = getattr(obj.agency, 'agency_profile', None)
            if agency_profile:
                data['business_name'] = agency_profile.business_name
                logo_url = None
                if agency_profile.logo:
                    logo_url = agency_profile.logo.url
                    request = self.context.get('request')
                    if request:
                        logo_url = request.build_absolute_uri(logo_url)
                data['logo'] = logo_url
            return data
        return None

    def _is_admin_request(self):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        return bool(user and user.is_authenticated and (user.is_staff or user.is_superuser))

    def get_provider_payout_account(self, obj):
        if not self._is_admin_request():
            return None

        provider = obj.guide or obj.agency or (obj.accommodation.host if obj.accommodation and obj.accommodation.host else None)
        if not provider:
            return None

        payout_account = {
            'provider_id': provider.id,
            'provider_username': provider.username,
            'account_type': provider.payout_account_type,
            'account_name': provider.payout_account_name,
            'account_number': provider.payout_account_number,
            'notes': provider.payout_account_notes,
        }

        if not any([
            payout_account['account_type'],
            payout_account['account_name'],
            payout_account['account_number'],
            payout_account['notes'],
        ]):
            return None

        return payout_account

    def get_payout_processed_by_detail(self, obj):
        if not obj.payout_processed_by:
            return None

        user = obj.payout_processed_by
        full_name = f"{user.first_name} {user.last_name}".strip() or user.username
        return {
            'id': user.id,
            'username': user.username,
            'full_name': full_name,
        }

    def get_tour_package_detail(self, obj):
        if not obj.guide and not obj.agency:
            return None

        selected = None
        if obj.tour_package:
            selected = obj.tour_package
        elif obj.tour_package_id:
            selected = TourPackage.objects.filter(id=obj.tour_package_id).first()

        trip_days = max((obj.check_out - obj.check_in).days + 1, 1)

        if not selected and obj.destination:
            candidates = TourPackage.objects.filter(
                main_destination=obj.destination,
                is_active=True,
                duration_days=trip_days,
            )
            if obj.guide:
                candidates = candidates.filter(guide=obj.guide)
            elif obj.agency:
                candidates = candidates.filter(agency__user=obj.agency)

            candidates = candidates.order_by('-created_at', '-id')

            if candidates.count() == 1:
                selected = candidates.first()

        if not selected:
            return None

        timeline = selected.itinerary_timeline
        if isinstance(timeline, str):
            try:
                timeline = json.loads(timeline)
            except json.JSONDecodeError:
                timeline = []
        elif not isinstance(timeline, list):
            timeline = []

        clipped_timeline = []
        for stop in timeline:
            if not isinstance(stop, dict):
                continue
            raw_day = stop.get('day', 1)
            try:
                day_num = int(raw_day)
            except (TypeError, ValueError):
                day_num = 1
            if day_num <= trip_days:
                clipped_timeline.append(stop)

        # NEW: Fetch the related TourStops so we have the images!
        stops_data = []
        request = self.context.get('request')
        for stop in selected.stops.all().order_by('order'):
            img_url = None
            if stop.image:
                img_url = stop.image.url
                if request:
                    img_url = request.build_absolute_uri(img_url)
            stops_data.append({
                'id': stop.id,
                'name': stop.name,
                'image': img_url,
                'order': stop.order
            })

        return {
            'id': selected.id,
            'name': selected.name,
            'duration_days': selected.duration_days,
            'price_per_day': selected.price_per_day,
            'solo_price': selected.solo_price,
            'additional_fee_per_head': selected.additional_fee_per_head,
            'max_group_size': selected.max_group_size,
            'itinerary_timeline': clipped_timeline,
            'stops': stops_data,  # NEW: Added stops array containing images
        }

    def get_refund_status(self, obj):
        latest_payment = obj.payments.order_by('-timestamp', '-id').first()
        if not latest_payment:
            return 'none'
        return latest_payment.refund_status or 'none'

    def get_assigned_guides_detail(self, obj):
        request = self.context.get('request')
        guides_data = []
        for guide in obj.assigned_guides.all():
            pic_url = None
            if guide.profile_picture:
                pic_url = guide.profile_picture.url
                if request:
                    pic_url = request.build_absolute_uri(pic_url)
            guides_data.append({
                'id': guide.id,
                'first_name': guide.first_name,
                'last_name': guide.last_name,
                'profile_picture': pic_url
            })
        return guides_data

    def get_assigned_agency_guides_detail(self, obj):
        request = self.context.get('request')
        guides_data = []
        for guide in obj.assigned_agency_guides.all():
            pic_url = None
            if guide.profile_picture:
                pic_url = guide.profile_picture.url
                if request:
                    pic_url = request.build_absolute_uri(pic_url)
            guides_data.append({
                'id': guide.id,
                'full_name': guide.full_name(), 
                'contact_number': guide.contact_number,
                'email': guide.email,          
                'languages': guide.languages,  
                'specialization': guide.specialization,
                'profile_picture': pic_url
            })
        return guides_data

    def validate(self, data):
        if self.instance:
            accommodation = data.get('accommodation', self.instance.accommodation)
            guide = data.get('guide', self.instance.guide)
            agency = data.get('agency', self.instance.agency)
            destination = data.get('destination', self.instance.destination)
            check_in = data.get('check_in', self.instance.check_in)
            check_out = data.get('check_out', self.instance.check_out)
            num_guests = data.get('num_guests', self.instance.num_guests)
            selected_package = data.get('tour_package', self.instance.tour_package)
        else:
            accommodation = data.get('accommodation')
            guide = data.get('guide')
            agency = data.get('agency')
            destination = data.get('destination')
            check_in = data.get('check_in')
            check_out = data.get('check_out')
            num_guests = data.get('num_guests', 1)
            selected_package = data.get('tour_package')

        if check_in and check_out:
            if check_out < check_in:
                raise serializers.ValidationError({"check_out": "Check-out cannot be before check-in."})
            
            if not self.instance or 'check_in' in data:
                if check_in < date.today():
                    raise serializers.ValidationError({"check_in": "Check-in date cannot be in the past."})

        is_accommodation = accommodation is not None
        is_guide = guide is not None
        is_agency = agency is not None

        if not (is_guide or is_accommodation or is_agency):
            raise serializers.ValidationError("A booking must target a Guide, Accommodation, or Agency.")

        if guide or agency:
            request = self.context.get('request')
            requested_tour_id = None
            if request:
                requested_tour_id = request.data.get('tour_package_id') or request.data.get('tour_package')

            if not selected_package and requested_tour_id:
                package_qs = TourPackage.objects.filter(
                    id=requested_tour_id,
                    is_active=True,
                )
                if guide:
                    package_qs = package_qs.filter(guide=guide)
                elif agency:
                    package_qs = package_qs.filter(agency__user=agency)
                if destination:
                    package_qs = package_qs.filter(main_destination=destination)
                selected_package = package_qs.first()

            if not selected_package and destination and check_in and check_out:
                trip_days = max((check_out - check_in).days + 1, 1)
                package_qs = TourPackage.objects.filter(
                    main_destination=destination,
                    is_active=True,
                    duration_days=trip_days,
                )
                if guide:
                    package_qs = package_qs.filter(guide=guide)
                elif agency:
                    package_qs = package_qs.filter(agency__user=agency)
                selected_package = package_qs.order_by('-created_at', '-id').first()

            try:
                guests_count = int(num_guests or 1)
            except (TypeError, ValueError):
                guests_count = 1

            if selected_package and guests_count > selected_package.max_group_size:
                raise serializers.ValidationError({
                    'num_guests': (
                        f"Maximum guests for '{selected_package.name}' is "
                        f"{selected_package.max_group_size}."
                    )
                })

        if guide and check_in and check_out:
                specific_dates = {
                    str(item) for item in (guide.specific_available_dates or []) if item
                }
                recurring_days = {
                    str(item) for item in (guide.available_days or []) if item
                }
                day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

                current_date = check_in
                first_unavailable_date = None

                while current_date <= check_out:
                    current_date_str = current_date.isoformat()
                    day_name = day_names[current_date.weekday()]
                    is_specific = current_date_str in specific_dates
                    is_recurring = 'All' in recurring_days or day_name in recurring_days
                    is_available = is_specific if len(specific_dates) > 0 else is_recurring

                    if not is_available:
                        first_unavailable_date = current_date_str
                        break

                    current_date += timedelta(days=1)

                if first_unavailable_date:
                    raise serializers.ValidationError({
                        'check_in': (
                            f"Guide is unavailable on {first_unavailable_date}. "
                            "Please choose available dates."
                        )
                    })

        return data


class BookingJourneyCheckpointSerializer(serializers.ModelSerializer):
    checked_by_detail = serializers.SerializerMethodField(read_only=True)
    updated_by_detail = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = BookingJourneyCheckpoint
        fields = [
            'id',
            'booking',
            'stop_key',
            'day_number',
            'stop_index',
            'stop_name',
            'start_time',
            'end_time',
            'stop_type',
            'is_checked',
            'guide_remarks',
            'tourist_remarks',
            'checked_by',
            'checked_by_detail',
            'checked_at',
            'updated_by',
            'updated_by_detail',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'booking',
            'stop_key',
            'day_number',
            'stop_index',
            'stop_name',
            'start_time',
            'end_time',
            'stop_type',
            'checked_by',
            'checked_by_detail',
            'checked_at',
            'updated_by',
            'updated_by_detail',
            'created_at',
            'updated_at',
        ]

    def get_checked_by_detail(self, obj):
        if not obj.checked_by:
            return None
        full_name = f"{obj.checked_by.first_name} {obj.checked_by.last_name}".strip() or obj.checked_by.username
        return {
            'id': obj.checked_by.id,
            'username': obj.checked_by.username,
            'full_name': full_name,
        }

    def get_updated_by_detail(self, obj):
        if not obj.updated_by:
            return None
        full_name = f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.username
        return {
            'id': obj.updated_by.id,
            'username': obj.updated_by.username,
            'full_name': full_name,
        }

    def _resolve_booking(self):
        booking = self.context.get('booking')
        if booking:
            return booking
        if self.instance is not None:
            return self.instance.booking
        return None

    def _is_provider_user(self, booking, user):
        if not booking or not user:
            return False
        if booking.guide_id == user.id:
            return True
        if booking.agency_id == user.id:
            return True
        if booking.accommodation and booking.accommodation.host_id == user.id:
            return True
        return booking.assigned_guides.filter(id=user.id).exists()

    def validate(self, attrs):
        request = self.context.get('request')
        user = getattr(request, 'user', None)
        booking = self._resolve_booking()

        if not booking or not user or not user.is_authenticated:
            return attrs

        is_admin = bool(user.is_staff or user.is_superuser)
        is_tourist = booking.tourist_id == user.id
        is_provider = self._is_provider_user(booking, user)

        if 'tourist_remarks' in attrs and not (is_tourist or is_admin):
            raise serializers.ValidationError({'tourist_remarks': 'Only the tourist can edit tourist remarks.'})

        if 'guide_remarks' in attrs and not (is_provider or is_admin):
            raise serializers.ValidationError({'guide_remarks': 'Only the guide or agency side can edit guide remarks.'})

        return attrs

    def update(self, instance, validated_data):
        request = self.context.get('request')
        user = getattr(request, 'user', None)

        if 'is_checked' in validated_data:
            incoming_checked = bool(validated_data['is_checked'])
            if incoming_checked:
                instance.checked_by = user if user and user.is_authenticated else None
                instance.checked_at = timezone.now()
            else:
                instance.checked_by = None
                instance.checked_at = None

        for attr in ('is_checked', 'guide_remarks', 'tourist_remarks'):
            if attr in validated_data:
                setattr(instance, attr, validated_data[attr])

        if user and user.is_authenticated:
            instance.updated_by = user

        instance.save()
        return instance