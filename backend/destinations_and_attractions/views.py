from rest_framework import viewsets, permissions, status, generics #type: ignore
from rest_framework.views import APIView #type: ignore
from rest_framework.response import Response #type: ignore
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser #type: ignore
from rest_framework.exceptions import PermissionDenied, ValidationError
from django_filters.rest_framework import DjangoFilterBackend #type: ignore
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.db import transaction
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone #type: ignore
from datetime import date, timedelta
from zoneinfo import ZoneInfo
from urllib.parse import quote

import requests

from .models import Destination, DestinationCategory, Attraction, TourPackage, TourStop, LocationCorrectionRequest
from .serializers import (
    DestinationSerializer, 
    DestinationListSerializer, 
    AttractionSerializer,
    TourPackageSerializer,
    GuideSerializer,
    LocationCorrectionCreateSerializer,
    LocationCorrectionRequestSerializer,
)
from backend.pagination import OptionalPageNumberPagination
from backend.location_policy import (
    CITY_SCOPE_LABEL,
    ZDS_MAPBOX_BBOX,
    extract_municipality_from_text,
    get_zds_municipality_choices,
    is_trusted_location_editor,
    validate_zds_coordinates,
)

User = get_user_model()

HIGHLIGHTS_TIMEZONE = ZoneInfo('Asia/Manila')
DEFAULT_DESTINATION_HIGHLIGHT_LIMIT = 3
MAX_DESTINATION_HIGHLIGHT_LIMIT = 10


def _get_previous_day_window(reference_time=None):
    localized_now = timezone.localtime(reference_time or timezone.now(), HIGHLIGHTS_TIMEZONE)
    start_today = localized_now.replace(hour=0, minute=0, second=0, microsecond=0)
    start_previous_day = start_today - timedelta(days=1)
    return start_previous_day, start_today, start_previous_day.date()


def _is_previous_day_requested(raw_value):
    normalized = str(raw_value or '').strip().lower()
    return normalized in {'1', 'true', 'yes', 'y', 'on', 'yesterday', 'previous_day'}


def _parse_positive_int(raw_value, *, default, minimum=1, maximum=None):
    try:
        parsed = int(raw_value)
    except (TypeError, ValueError):
        parsed = default

    if parsed < minimum:
        parsed = minimum

    if maximum is not None and parsed > maximum:
        parsed = maximum

    return parsed


def _parse_destination_id_list(raw_values):
    destination_ids = []
    seen = set()

    for value in raw_values:
        chunk = str(value or '').strip()
        if not chunk:
            continue

        for item in chunk.split(','):
            token = item.strip()
            if not token:
                continue

            try:
                destination_id = int(token)
            except (TypeError, ValueError):
                continue

            if destination_id <= 0 or destination_id in seen:
                continue

            seen.add(destination_id)
            destination_ids.append(destination_id)

    return destination_ids


def _resolve_correction_target(validated_data):
    target_type = validated_data['target_type']

    if target_type == 'destination':
        target_id = validated_data['destination_id']
        return target_type, get_object_or_404(Destination, pk=target_id)

    if target_type == 'accommodation':
        from accommodation_booking.models import Accommodation

        target_id = validated_data['accommodation_id']
        return target_type, get_object_or_404(Accommodation, pk=target_id)

    if target_type == 'booking_meetup':
        from accommodation_booking.models import Booking

        target_id = validated_data['booking_id']
        return target_type, get_object_or_404(Booking, pk=target_id)

    raise ValidationError({'target_type': 'Unsupported correction target type.'})


def _build_target_snapshot(target_type, target):
    if target_type == 'destination':
        return {
            'current_location': target.location or '',
            'current_municipality': target.municipality or '',
            'current_latitude': target.latitude,
            'current_longitude': target.longitude,
        }

    if target_type == 'accommodation':
        return {
            'current_location': target.location or '',
            'current_municipality': target.municipality or '',
            'current_latitude': target.latitude,
            'current_longitude': target.longitude,
        }

    if target_type == 'booking_meetup':
        return {
            'current_location': target.meetup_location or '',
            'current_municipality': target.meetup_municipality or '',
            'current_latitude': target.meetup_latitude,
            'current_longitude': target.meetup_longitude,
        }

    raise ValidationError({'target_type': 'Unsupported correction target type.'})


def _can_auto_apply_correction(user, target_type, target):
    if not is_trusted_location_editor(user):
        return False

    if user.is_staff or user.is_superuser:
        return True

    if target_type == 'destination':
        return True

    if target_type == 'accommodation':
        if target.host_id == user.id:
            return True

        if hasattr(user, 'agency_profile') and target.agency_id == user.agency_profile.id:
            return True

        return False

    if target_type == 'booking_meetup':
        if target.guide_id == user.id or target.agency_id == user.id:
            return True

        if target.accommodation and target.accommodation.host_id == user.id:
            return True

        return target.assigned_guides.filter(id=user.id).exists()

    return False


def _apply_correction(correction, reviewed_by, review_note=''):
    with transaction.atomic():
        if correction.target_type == 'destination' and correction.destination:
            destination = correction.destination
            destination.location = correction.proposed_location
            destination.municipality = correction.proposed_municipality or None
            destination.latitude = correction.proposed_latitude
            destination.longitude = correction.proposed_longitude
            destination.save()

        elif correction.target_type == 'accommodation' and correction.accommodation:
            accommodation = correction.accommodation
            accommodation.location = correction.proposed_location
            accommodation.municipality = correction.proposed_municipality or None
            accommodation.latitude = correction.proposed_latitude
            accommodation.longitude = correction.proposed_longitude
            accommodation.save()

        elif correction.target_type == 'booking_meetup' and correction.booking:
            booking = correction.booking
            booking.meetup_location = correction.proposed_location
            booking.meetup_municipality = correction.proposed_municipality or None
            booking.meetup_latitude = correction.proposed_latitude
            booking.meetup_longitude = correction.proposed_longitude
            booking.save()

        else:
            raise ValidationError({'target_type': 'Target record does not exist anymore.'})

        now = timezone.now()
        correction.status = 'approved'
        correction.reviewed_by = reviewed_by
        correction.reviewed_at = now
        correction.applied_at = now
        correction.review_note = str(review_note or '').strip()
        correction.save(
            update_fields=['status', 'reviewed_by', 'reviewed_at', 'applied_at', 'review_note', 'updated_at']
        )

    return correction

class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user.is_staff

# NEW: Permission for both Guides and Agencies
class IsGuideOrAgency(permissions.BasePermission):
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        is_guide = getattr(request.user, 'is_local_guide', False)
        is_agency = hasattr(request.user, 'agency_profile')
        return is_guide or is_agency


class CategoryChoicesView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _build_category_choices(self):
        defaults = [choice[0] for choice in Destination.CATEGORY_CHOICES]
        custom = list(DestinationCategory.objects.values_list('name', flat=True))
        used = list(Destination.objects.order_by().values_list('category', flat=True).distinct())

        categories = []
        seen = set()

        for source in (defaults, custom, used):
            for raw in source:
                category = str(raw or '').strip()
                if not category:
                    continue

                key = category.lower()
                if key in seen:
                    continue

                seen.add(key)
                categories.append(category)

        return categories

    def get(self, request):
        return Response(self._build_category_choices())

    def post(self, request):
        if not request.user.is_staff:
            return Response({'detail': 'Only admins can add categories.'}, status=status.HTTP_403_FORBIDDEN)

        raw_name = request.data.get('name') or request.data.get('category') or ''
        name = str(raw_name).strip()

        if not name:
            return Response({'detail': 'Category name is required.'}, status=status.HTTP_400_BAD_REQUEST)

        if len(name) > 50:
            return Response({'detail': 'Category name must be 50 characters or less.'}, status=status.HTTP_400_BAD_REQUEST)

        existing_custom = DestinationCategory.objects.filter(name__iexact=name).first()
        if existing_custom:
            category_name = existing_custom.name
            created = False
        else:
            existing_known = next(
                (category for category in self._build_category_choices() if category.lower() == name.lower()),
                None,
            )
            if existing_known:
                category_name = existing_known
                created = False
            else:
                created_entry = DestinationCategory.objects.create(name=name)
                category_name = created_entry.name
                created = True

        return Response(
            {
                'detail': 'Category added successfully.' if created else 'Category already exists.',
                'category': category_name,
                'categories': self._build_category_choices(),
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MunicipalityChoicesView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, _request):
        return Response(
            {
                'municipalities': get_zds_municipality_choices(),
                'bbox': {
                    'west': ZDS_MAPBOX_BBOX[0],
                    'south': ZDS_MAPBOX_BBOX[1],
                    'east': ZDS_MAPBOX_BBOX[2],
                    'north': ZDS_MAPBOX_BBOX[3],
                },
                'scope': CITY_SCOPE_LABEL,
            }
        )


class LocationSearchView(APIView):
    permission_classes = [permissions.AllowAny]

    def _search_with_nominatim(self, candidate_queries, limit):
        results = []
        seen_result_ids = set()

        # Nominatim expects viewbox as: left,top,right,bottom
        viewbox = f"{ZDS_MAPBOX_BBOX[0]},{ZDS_MAPBOX_BBOX[3]},{ZDS_MAPBOX_BBOX[2]},{ZDS_MAPBOX_BBOX[1]}"
        headers = {
            'Accept': 'application/json',
            'Accept-Language': 'en',
            'User-Agent': 'localynk-backend/1.0',
        }

        for candidate_query in candidate_queries:
            params = {
                'q': candidate_query,
                'format': 'jsonv2',
                'limit': limit,
                'countrycodes': 'ph',
                'addressdetails': 1,
                'viewbox': viewbox,
                'bounded': 1,
            }

            try:
                response = requests.get(
                    'https://nominatim.openstreetmap.org/search',
                    params=params,
                    headers=headers,
                    timeout=8,
                )
                response.raise_for_status()
                payload = response.json()
            except requests.RequestException:
                continue

            if not isinstance(payload, list):
                continue

            for item in payload:
                latitude = item.get('lat')
                longitude = item.get('lon')

                try:
                    lat_value, lng_value = validate_zds_coordinates(latitude, longitude)
                except ValueError:
                    continue

                result_id = str(item.get('place_id') or f"{lat_value}:{lng_value}")
                if result_id in seen_result_ids:
                    continue

                seen_result_ids.add(result_id)

                label = item.get('display_name') or candidate_query
                municipality = extract_municipality_from_text(label) or CITY_SCOPE_LABEL

                results.append(
                    {
                        'id': result_id,
                        'label': label,
                        'name': item.get('name') or label,
                        'municipality': municipality,
                        'latitude': lat_value,
                        'longitude': lng_value,
                    }
                )

                if len(results) >= limit:
                    return results

        return results

    # Replace your existing LocationSearchView.get method with this updated version:

    def get(self, request):
        query = str(request.query_params.get('q') or request.query_params.get('query') or '').strip()
        if len(query) < 2:
            return Response([])

        mapbox_token = str(getattr(settings, 'MAPBOX_ACCESS_TOKEN', '') or '').strip()

        limit_raw = request.query_params.get('limit', 8)
        try:
            limit = max(1, min(int(limit_raw), 15))
        except (TypeError, ValueError):
            limit = 8

        candidate_queries = [query]
        query_lower = query.lower()
        city_lower = CITY_SCOPE_LABEL.lower()

        if city_lower not in query_lower:
            candidate_queries.append(f"{query}, {CITY_SCOPE_LABEL}")

        if 'santa cruz' in query_lower:
            candidate_queries.append(f"Sta Cruz Island, {CITY_SCOPE_LABEL}")
        elif 'sta cruz' in query_lower:
            candidate_queries.append(f"Santa Cruz Island, {CITY_SCOPE_LABEL}")

        results = []
        seen_coordinates = set()

        # 1. NEW: Provide existing destinations as suggestions first
        existing_dests = Destination.objects.filter(
            Q(name__icontains=query) | Q(location__icontains=query)
        ).exclude(latitude__isnull=True).exclude(longitude__isnull=True)[:limit]

        for dest in existing_dests:
            try:
                lat_val = float(dest.latitude)
                lng_val = float(dest.longitude)
                coord_key = f"{lat_val:.4f},{lng_val:.4f}"
                
                if coord_key not in seen_coordinates:
                    seen_coordinates.add(coord_key)
                    results.append({
                        'id': f"local_dest_{dest.id}",
                        'label': dest.location,
                        'name': dest.location,
                        'municipality': dest.municipality or CITY_SCOPE_LABEL,
                        'latitude': lat_val,
                        'longitude': lng_val,
                        'is_existing': True,
                        'existing_name': dest.name
                    })
            except (TypeError, ValueError):
                pass

        center_lng = (ZDS_MAPBOX_BBOX[0] + ZDS_MAPBOX_BBOX[2]) / 2
        center_lat = (ZDS_MAPBOX_BBOX[1] + ZDS_MAPBOX_BBOX[3]) / 2

        features = []
        seen_feature_ids = set()
        had_successful_mapbox_request = False

        if mapbox_token and len(results) < limit:
            base_params = {
                'access_token': mapbox_token,
                'country': 'PH',
                'bbox': ','.join(str(value) for value in ZDS_MAPBOX_BBOX),
                'types': 'place,locality,neighborhood,address,poi',
                'autocomplete': 'true',
                'proximity': f"{center_lng},{center_lat}",
                'limit': limit,
            }

            for candidate_query in candidate_queries:
                endpoint = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{quote(candidate_query)}.json"

                try:
                    provider_response = requests.get(endpoint, params=base_params, timeout=8)
                    provider_response.raise_for_status()
                    payload = provider_response.json()
                    had_successful_mapbox_request = True
                except requests.RequestException:
                    continue

                for feature in payload.get('features', []):
                    feature_id = str(feature.get('id') or '')
                    if feature_id and feature_id in seen_feature_ids:
                        continue

                    if feature_id:
                        seen_feature_ids.add(feature_id)

                    features.append(feature)

                if len(features) >= limit:
                    break

        for feature in features:
            if len(results) >= limit:
                break

            center = feature.get('center') or []
            if len(center) != 2:
                continue

            longitude, latitude = center[0], center[1]
            try:
                lat_value, lng_value = validate_zds_coordinates(latitude, longitude)
            except ValueError:
                continue

            # Prevent duplicating identical coordinates
            coord_key = f"{lat_value:.4f},{lng_value:.4f}"
            if coord_key in seen_coordinates:
                continue
            seen_coordinates.add(coord_key)

            label = feature.get('place_name') or feature.get('text') or ''
            municipality = extract_municipality_from_text(label)
            if not municipality:
                municipality = CITY_SCOPE_LABEL

            results.append(
                {
                    'id': feature.get('id'),
                    'label': label,
                    'name': feature.get('text') or label,
                    'municipality': municipality,
                    'latitude': lat_value,
                    'longitude': lng_value,
                }
            )

        if results:
            return Response(results)

        nominatim_results = self._search_with_nominatim(candidate_queries, limit)
        if nominatim_results:
            return Response(nominatim_results)

        if mapbox_token and not had_successful_mapbox_request:
            return Response(
                {'detail': 'Location search providers are currently unavailable.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response([])


class LocationCorrectionListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (JSONParser,)

    def get(self, request):
        queryset = LocationCorrectionRequest.objects.select_related(
            'submitted_by',
            'reviewed_by',
            'destination',
            'accommodation',
            'booking',
        )

        if not (request.user.is_staff or request.user.is_superuser):
            queryset = queryset.filter(submitted_by=request.user)

        status_filter = str(request.query_params.get('status', '')).strip().lower()
        if status_filter in {'pending', 'approved', 'rejected'}:
            queryset = queryset.filter(status=status_filter)

        target_type = str(request.query_params.get('target_type', '')).strip().lower()
        if target_type in {'destination', 'accommodation', 'booking_meetup'}:
            queryset = queryset.filter(target_type=target_type)

        serializer = LocationCorrectionRequestSerializer(queryset[:200], many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = LocationCorrectionCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        validated = serializer.validated_data

        target_type, target = _resolve_correction_target(validated)
        current_snapshot = _build_target_snapshot(target_type, target)

        correction = LocationCorrectionRequest.objects.create(
            submitted_by=request.user,
            target_type=target_type,
            destination=target if target_type == 'destination' else None,
            accommodation=target if target_type == 'accommodation' else None,
            booking=target if target_type == 'booking_meetup' else None,
            current_location=current_snapshot['current_location'],
            current_municipality=current_snapshot['current_municipality'],
            current_latitude=current_snapshot['current_latitude'],
            current_longitude=current_snapshot['current_longitude'],
            proposed_location=validated['proposed_location'],
            proposed_municipality=validated['proposed_municipality'],
            proposed_latitude=validated['proposed_latitude'],
            proposed_longitude=validated['proposed_longitude'],
            reason=validated.get('reason') or '',
        )

        if _can_auto_apply_correction(request.user, target_type, target):
            _apply_correction(
                correction,
                reviewed_by=request.user,
                review_note='Auto-approved because this request came from a trusted role.',
            )

        response_serializer = LocationCorrectionRequestSerializer(correction)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class LocationCorrectionReviewView(APIView):
    permission_classes = [permissions.IsAdminUser]
    parser_classes = (JSONParser,)

    def patch(self, request, pk):
        correction = get_object_or_404(LocationCorrectionRequest, pk=pk)
        if correction.status != 'pending':
            raise ValidationError({'detail': 'Only pending corrections can be reviewed.'})

        action = str(request.data.get('action') or '').strip().lower()
        review_note = str(request.data.get('review_note') or '').strip()

        if action == 'approve':
            _apply_correction(correction, reviewed_by=request.user, review_note=review_note)
        elif action == 'reject':
            correction.status = 'rejected'
            correction.reviewed_by = request.user
            correction.reviewed_at = timezone.now()
            correction.review_note = review_note
            correction.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_note', 'updated_at'])
        else:
            raise ValidationError({'action': "Action must be either 'approve' or 'reject'."})

        serializer = LocationCorrectionRequestSerializer(correction)
        return Response(serializer.data)

class DestinationViewSet(viewsets.ModelViewSet):
    queryset = Destination.objects.all().prefetch_related('images', 'attractions')
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = OptionalPageNumberPagination

    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_featured', 'category']

    def get_serializer_class(self):
        if self.action == 'list':
            return DestinationListSerializer
        return DestinationSerializer

class AttractionViewSet(viewsets.ModelViewSet):
    queryset = Attraction.objects.all()
    serializer_class = AttractionSerializer
    permission_classes = [IsAdminOrReadOnly]

class DestinationAttractionListView(generics.ListAPIView):
    serializer_class = AttractionSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        destination_pk = self.kwargs['destination_pk']
        return Attraction.objects.filter(destination__pk=destination_pk)


class DestinationNewPackageHighlightsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        requested_destination_ids = request.query_params.getlist('destination_ids')
        single_destination_id = request.query_params.get('destination_id')
        if single_destination_id:
            requested_destination_ids.append(single_destination_id)

        destination_ids = _parse_destination_id_list(requested_destination_ids)

        per_destination_limit = _parse_positive_int(
            request.query_params.get('limit_per_destination'),
            default=DEFAULT_DESTINATION_HIGHLIGHT_LIMIT,
            minimum=1,
            maximum=MAX_DESTINATION_HIGHLIGHT_LIMIT,
        )

        start_previous_day, start_today, target_date = _get_previous_day_window()

        highlight_queryset = TourPackage.objects.filter(
            main_destination__isnull=False,
            is_active=True,
            created_at__gte=start_previous_day,
            created_at__lt=start_today,
        ).select_related(
            'main_destination',
            'guide',
            'agency__user',
        )

        if destination_ids:
            highlight_queryset = highlight_queryset.filter(main_destination_id__in=destination_ids)

        highlight_queryset = highlight_queryset.order_by('main_destination_id', '-created_at', '-id')

        counts_by_destination = {
            item['main_destination_id']: item['total']
            for item in highlight_queryset.order_by().values('main_destination_id').annotate(total=Count('id'))
        }

        payload_by_destination = {}

        for package in highlight_queryset:
            destination_id = package.main_destination_id
            if not destination_id:
                continue

            if destination_id not in payload_by_destination:
                payload_by_destination[destination_id] = {
                    'destination_id': destination_id,
                    'destination_name': package.main_destination.name if package.main_destination else '',
                    'new_packages_count': int(counts_by_destination.get(destination_id, 0)),
                    'packages': [],
                }

            destination_entry = payload_by_destination[destination_id]

            if len(destination_entry['packages']) >= per_destination_limit:
                continue

            owner_type = 'guide'
            owner_name = ''
            guide_id = package.guide_id
            agency_user_id = None

            if package.agency_id:
                owner_type = 'agency'
                owner_name = str(getattr(package.agency, 'business_name', '') or '').strip()
                guide_id = None
                agency_user_id = getattr(package.agency, 'user_id', None)
            elif package.guide_id:
                full_name = package.guide.get_full_name() if package.guide else ''
                owner_name = str(full_name or '').strip() or str(getattr(package.guide, 'username', '') or '').strip()

            if not owner_name:
                owner_name = 'Local Provider'

            destination_entry['packages'].append(
                {
                    'id': package.id,
                    'name': package.name,
                    'duration_days': package.duration_days,
                    'created_at': package.created_at,
                    'owner_type': owner_type,
                    'owner_name': owner_name,
                    'guide_id': guide_id,
                    'agency_user_id': agency_user_id,
                    'agency_id': package.agency_id,
                    'destination_id': destination_id,
                    'destination_name': destination_entry['destination_name'],
                }
            )

        ordered_destinations = sorted(
            payload_by_destination.values(),
            key=lambda item: (
                -(item.get('new_packages_count') or 0),
                str(item.get('destination_name') or '').lower(),
            ),
        )

        destination_counts = {
            str(destination_id): int(count)
            for destination_id, count in counts_by_destination.items()
        }

        return Response(
            {
                'timezone': str(HIGHLIGHTS_TIMEZONE),
                'target_date': target_date.isoformat(),
                'per_destination_limit': per_destination_limit,
                'destination_counts': destination_counts,
                'destinations': ordered_destinations,
            }
        )


class CreateTourView(generics.CreateAPIView):
    queryset = TourPackage.objects.all()
    serializer_class = TourPackageSerializer
    permission_classes = [IsGuideOrAgency] # CHANGED
    parser_classes = (MultiPartParser, FormParser)

    def perform_create(self, serializer):
        # SMART LOGIC: Assign to agency if they are an agency, otherwise assign to guide
        user = self.request.user
        if hasattr(user, 'agency_profile'):
            serializer.save(agency=user.agency_profile)
        else:
            serializer.save(guide=user)

class MyToursListView(generics.ListAPIView):
    serializer_class = TourPackageSerializer
    permission_classes = [IsGuideOrAgency] # CHANGED

    def get_queryset(self):
        # SMART LOGIC: Fetch tours based on user type
        user = self.request.user
        if hasattr(user, 'agency_profile'):
            return TourPackage.objects.filter(agency=user.agency_profile)
        return TourPackage.objects.filter(guide=user)

class ToursByDestinationListView(generics.ListAPIView):
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        destination_id = self.kwargs['destination_id']
        queryset = TourPackage.objects.filter(main_destination__id=destination_id, is_active=True)

        if _is_previous_day_requested(self.request.query_params.get('new_packages')):
            start_previous_day, start_today, _ = _get_previous_day_window()
            queryset = queryset.filter(created_at__gte=start_previous_day, created_at__lt=start_today)

        return queryset.order_by('-created_at', '-id')

class GuideToursListView(generics.ListAPIView):
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        guide_id = self.kwargs['guide_id']
        return TourPackage.objects.filter(guide__id=guide_id, is_active=True)

class GuideDestinationsListView(generics.ListAPIView):
    serializer_class = DestinationListSerializer 
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        guide_id = self.kwargs['guide_id']
        return Destination.objects.filter(
            tour_packages__guide__id=guide_id,
            tour_packages__is_active=True
        ).distinct()

class TourDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = TourPackage.objects.all()
    serializer_class = TourPackageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser) 

    def perform_update(self, serializer):
        user = self.request.user
        instance = self.get_object()
        
        # Verify ownership before allowing edit
        if hasattr(user, 'agency_profile') and instance.agency == user.agency_profile:
            serializer.save()
        elif instance.guide == user:
            serializer.save()
        else:
            raise PermissionDenied("You do not have permission to edit this tour.")

    def perform_destroy(self, instance):
        user = self.request.user
        
        # Verify ownership before allowing delete
        if hasattr(user, 'agency_profile') and instance.agency == user.agency_profile:
            instance.delete()
        elif instance.guide == user:
            instance.delete()
        else:
            raise PermissionDenied("You do not have permission to delete this tour.")

class GuideListView(generics.ListAPIView):
    serializer_class = GuideSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        queryset = User.objects.filter(
            is_local_guide=True,
            is_guide_visible=True,
            guide_approved=True
        ).annotate(
            active_bookings_count=Count(
                'guide_tours_booked',
                filter=Q(
                    guide_tours_booked__status='Confirmed',
                    guide_tours_booked__check_out__gte=date.today(),
                ),
                distinct=True,
            )
        ).prefetch_related('tours').distinct()
        
        destination_id = self.request.query_params.get('main_destination')
        if destination_id:
            queryset = queryset.filter(
                tours__main_destination__id=destination_id,
                tours__is_active=True
            ).distinct()
        
        return queryset