from rest_framework import viewsets, permissions, generics, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser 
from django.db.models import Q, F, Value, DecimalField, ExpressionWrapper, Case, When #type: ignore
from django.db.models.functions import Coalesce #type: ignore
from django.db import transaction
from datetime import date, timedelta, datetime
from django.utils import timezone #type: ignore
from django.utils.text import slugify
from django.shortcuts import get_object_or_404
from django.conf import settings
from decimal import Decimal
import json

from .models import Accommodation, Booking, BookingJourneyCheckpoint
from .serializers import AccommodationSerializer, BookingSerializer, BookingJourneyCheckpointSerializer
from system_management_module.models import SystemAlert
from system_management_module.services.push_notifications import send_push_to_user, build_alert_push_data
from system_management_module.services.email_preferences import send_preference_aware_email
from destinations_and_attractions.models import TourPackage  
from backend.pagination import OptionalPageNumberPagination
from backend.location_policy import validate_zds_location_payload

from rest_framework.views import APIView


def format_booking_date_display(check_in, check_out):
    if not check_in:
        return "N/A"
    
    start_date = check_in.date() if hasattr(check_in, 'date') else check_in
    
    if not check_out:
        return start_date.strftime('%B %d, %Y') if hasattr(start_date, 'strftime') else str(start_date)
    
    end_date = check_out.date() if hasattr(check_out, 'date') else check_out
    
    try:
        start_str = start_date.strftime('%B %d, %Y')
        end_str = end_date.strftime('%B %d, %Y')
        
        if start_date == end_date:
            return start_str
        return f"{start_str} to {end_str}"
    except Exception:
        if start_date == end_date:
            return str(start_date)
        return f"{start_date} to {end_date}"


def generate_itinerary_html_and_plain(instance):
    itinerary_html = ""
    itinerary_plain = ""
    
    selected_package = instance.tour_package
    
    if not selected_package and instance.destination:
        provider = instance.guide or instance.agency
        if provider:
            trip_days = max((instance.check_out - instance.check_in).days + 1, 1)
            candidates = TourPackage.objects.filter(
                main_destination=instance.destination,
                is_active=True,
                duration_days__in=[trip_days, max(trip_days - 1, 1)]
            )
            if instance.guide:
                candidates = candidates.filter(guide=instance.guide)
            elif instance.agency:
                candidates = candidates.filter(agency__user=instance.agency)
                
            candidates = candidates.order_by('-created_at', '-id')
            if candidates.exists():
                selected_package = candidates.first()
            
    if selected_package and selected_package.itinerary_timeline:
        timeline = selected_package.itinerary_timeline
        
        if isinstance(timeline, str):
            try:
                timeline = json.loads(timeline)
            except json.JSONDecodeError:
                timeline = []
                
        if isinstance(timeline, list) and len(timeline) > 0:
            grouped_days = {}
            for item in timeline:
                if isinstance(item, dict):
                    day_num = str(item.get('day', 1))
                    if day_num not in grouped_days:
                        grouped_days[day_num] = []
                    grouped_days[day_num].append(item)
            
            if grouped_days:
                itinerary_html += """
                <div style='margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;'>
                    <h3 style='font-size: 14px; font-weight: bold; color: #333; margin-bottom: 10px; text-transform: uppercase;'>Itinerary Schedule</h3>
                """
                itinerary_plain += "\nITINERARY SCHEDULE:\n"
                
                sorted_days = sorted(grouped_days.keys(), key=lambda x: int(x))
                trip_days = max((instance.check_out - instance.check_in).days + 1, 1)
                
                for day in sorted_days:
                    if int(day) > trip_days:
                        continue
                        
                    itinerary_html += f"<p style='font-size: 14px; font-weight: bold; color: #0072FF; margin: 15px 0 5px 0;'>Day {day}</p>"
                    itinerary_plain += f"Day {day}:\n"
                    
                    for stop in grouped_days[day]:
                        time_str = stop.get('startTime', '')
                        end_time_str = stop.get('endTime', '')
                        name_str = stop.get('activityName', stop.get('name', 'Activity Stop'))
                        
                        time_display = ""
                        if time_str:
                            time_display = f"({time_str}"
                            if end_time_str:
                                time_display += f" - {end_time_str}"
                            time_display += ") "
                            
                        itinerary_html += f"<p style='margin: 4px 0 4px 10px; font-size: 14px; color: #475569;'>• {time_display}<strong>{name_str}</strong></p>"
                        itinerary_plain += f"  - {time_display}{name_str}\n"
                
                itinerary_html += "</div>"
                
    return itinerary_html, itinerary_plain


def _parse_booking_itinerary_timeline(booking):
    selected_package = booking.tour_package

    if not selected_package and booking.destination:
        provider = booking.guide or booking.agency
        if provider:
            trip_days = max((booking.check_out - booking.check_in).days + 1, 1)
            candidates = TourPackage.objects.filter(
                main_destination=booking.destination,
                is_active=True,
                duration_days=trip_days,
            )
            if booking.guide:
                candidates = candidates.filter(guide=booking.guide)
            elif booking.agency:
                candidates = candidates.filter(agency__user=booking.agency)

            selected_package = candidates.order_by('-created_at', '-id').first()

    if not selected_package:
        return []

    timeline = selected_package.itinerary_timeline
    if isinstance(timeline, str):
        try:
            timeline = json.loads(timeline)
        except json.JSONDecodeError:
            timeline = []

    if not isinstance(timeline, list):
        return []

    trip_days = max((booking.check_out - booking.check_in).days + 1, 1)
    filtered = []
    for stop in timeline:
        if not isinstance(stop, dict):
            continue
        raw_day = stop.get('day', 1)
        try:
            day_number = int(raw_day)
        except (TypeError, ValueError):
            day_number = 1
        if day_number <= trip_days:
            filtered.append(stop)

    return filtered


def _booking_participant_check(booking, user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    if booking.tourist_id == user.id:
        return True
    if booking.guide_id == user.id:
        return True
    if booking.agency_id == user.id:
        return True
    if booking.accommodation and booking.accommodation.host_id == user.id:
        return True
    return booking.assigned_guides.filter(id=user.id).exists()


def _stop_display_name(stop_payload):
    return (
        stop_payload.get('activityName')
        or stop_payload.get('name')
        or stop_payload.get('title')
        or stop_payload.get('location')
        or 'Activity Stop'
    )


def _build_stop_key(day_number, stop_index, stop_name):
    slug = slugify(str(stop_name or 'stop'))[:40] or 'stop'
    return f"d{day_number}-s{stop_index}-{slug}"


def ensure_booking_journey_checkpoints(booking):
    existing = list(
        BookingJourneyCheckpoint.objects.filter(booking=booking).order_by('day_number', 'stop_index', 'id')
    )
    if existing:
        return existing, False

    timeline = _parse_booking_itinerary_timeline(booking)
    if not timeline:
        return [], False

    rows = []
    day_counters = {}

    for stop in timeline:
        raw_day = stop.get('day', 1)
        try:
            day_number = max(int(raw_day), 1)
        except (TypeError, ValueError):
            day_number = 1

        stop_index = day_counters.get(day_number, 0)
        day_counters[day_number] = stop_index + 1

        stop_name = _stop_display_name(stop)
        rows.append(
            BookingJourneyCheckpoint(
                booking=booking,
                stop_key=_build_stop_key(day_number, stop_index, stop_name),
                day_number=day_number,
                stop_index=stop_index,
                stop_name=stop_name,
                start_time=stop.get('startTime') or '',
                end_time=stop.get('endTime') or '',
                stop_type=str(stop.get('type') or ''),
            )
        )

    if rows:
        with transaction.atomic():
            BookingJourneyCheckpoint.objects.bulk_create(rows, ignore_conflicts=True)

    refreshed = list(
        BookingJourneyCheckpoint.objects.filter(booking=booking).order_by('day_number', 'stop_index', 'id')
    )
    return refreshed, bool(rows)


class BookingJourneyBaseView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (JSONParser,)

    def get_booking_instance(self, request, booking_pk):
        booking = get_object_or_404(
            Booking.objects.select_related(
                'tourist',
                'guide',
                'agency',
                'accommodation__host',
                'tour_package',
                'destination',
            ).prefetch_related('assigned_guides'),
            pk=booking_pk,
        )

        if not _booking_participant_check(booking, request.user):
            raise PermissionDenied("You cannot access this booking journey.")

        return booking


class BookingJourneyListCreateView(BookingJourneyBaseView):
    def get(self, request, pk):
        booking = self.get_booking_instance(request, pk)
        checkpoints, _created = ensure_booking_journey_checkpoints(booking)
        serializer = BookingJourneyCheckpointSerializer(
            checkpoints,
            many=True,
            context={'request': request, 'booking': booking},
        )
        return Response(serializer.data)

    def post(self, request, pk):
        booking = self.get_booking_instance(request, pk)

        raw_force_reset = str(request.data.get('force_reset', '')).strip().lower()
        force_reset = raw_force_reset in {'1', 'true', 'yes'}
        if force_reset:
            if not (request.user.is_staff or request.user.is_superuser):
                raise PermissionDenied("Only admins can reset journey checkpoints.")
            booking.journey_checkpoints.all().delete()

        checkpoints, created = ensure_booking_journey_checkpoints(booking)
        serializer = BookingJourneyCheckpointSerializer(
            checkpoints,
            many=True,
            context={'request': request, 'booking': booking},
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class BookingJourneyCheckpointDetailView(BookingJourneyBaseView):
    def get_checkpoint_instance(self, request, booking_pk, checkpoint_pk):
        booking = self.get_booking_instance(request, booking_pk)
        checkpoint = get_object_or_404(BookingJourneyCheckpoint, pk=checkpoint_pk, booking=booking)
        return booking, checkpoint

    def patch(self, request, pk, checkpoint_id):
        booking, checkpoint = self.get_checkpoint_instance(request, pk, checkpoint_id)
        serializer = BookingJourneyCheckpointSerializer(
            checkpoint,
            data=request.data,
            partial=True,
            context={'request': request, 'booking': booking},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def delete(self, request, pk, checkpoint_id):
        _booking, checkpoint = self.get_checkpoint_instance(request, pk, checkpoint_id)
        if not (request.user.is_staff or request.user.is_superuser):
            raise PermissionDenied("Only admins can delete journey checkpoints.")
        checkpoint.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class IsHostOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        is_guide = request.user.is_local_guide and request.user.guide_approved
        is_agency = hasattr(request.user, 'agency_profile')
        return is_guide or is_agency

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        if obj.agency and hasattr(request.user, 'agency_profile'):
            return obj.agency == request.user.agency_profile
        return obj.host == request.user


class AccommodationViewSet(viewsets.ModelViewSet):
    serializer_class = AccommodationSerializer
    permission_classes = [IsHostOrReadOnly]
    parser_classes = (MultiPartParser, FormParser, JSONParser) 

    def get_queryset(self):
        qs = Accommodation.objects.all().select_related('host', 'agency')
        target_host_id = self.request.query_params.get('host_id')
        target_agency_id = self.request.query_params.get('agency_id')
        
        if target_host_id:
            return qs.filter(host_id=target_host_id, is_approved=True).order_by('-created_at')
        if target_agency_id:
            return qs.filter(agency_id=target_agency_id, is_approved=True).order_by('-created_at')

        user = self.request.user
        
        if not user.is_authenticated:
            return qs.filter(is_approved=True).order_by('-created_at')
        
        # Admin can see everything
        if user.is_staff and not hasattr(user, 'agency_profile'):
            return qs.order_by('-created_at')

        # FIX: Agencies should ONLY see their own accommodations
        if hasattr(user, 'agency_profile'):
            return qs.filter(agency=user.agency_profile).order_by('-created_at')
            
        # FIX: Guides should ONLY see their own accommodations
        if user.is_local_guide:
            return qs.filter(host=user).order_by('-created_at')

        # For Tourists: They should see ALL approved accommodations.
        return qs.filter(is_approved=True).order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if hasattr(user, 'agency_profile'):
            serializer.save(agency=user.agency_profile, is_approved=True)
        else:
            serializer.save(host=user, is_approved=True)

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user
        
        if instance.agency:
            if not hasattr(user, 'agency_profile') or instance.agency != user.agency_profile:
                 raise PermissionDenied("You cannot edit this agency's listing.")
        elif instance.host:
             if instance.host != user:
                 raise PermissionDenied("You cannot edit this listing.")
                 
        serializer.save()


class AccommodationDropdownListView(generics.ListAPIView):
    serializer_class = AccommodationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'agency_profile'):
            return Accommodation.objects.filter(agency=user.agency_profile).order_by('title')
        return Accommodation.objects.filter(host=user).order_by('title')


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        user = self.request.user
        qs = Booking.objects.select_related('tourist', 'accommodation', 'guide', 'agency').prefetch_related('payments')

        if not user.is_superuser:
            view_as = self.request.query_params.get('view_as')

            if view_as == 'guide':
                qs = qs.filter(
                    Q(accommodation__host=user) |
                    Q(guide=user) |
                    Q(agency=user) |
                    Q(assigned_guides=user)
                ).distinct()
            else:
                qs = qs.filter(
                    Q(tourist=user) |
                    Q(accommodation__host=user) |
                    Q(guide=user) |
                    Q(agency=user) |
                    Q(assigned_guides=user)
                ).distinct()

        financial_only = str(self.request.query_params.get('financial_only', '')).lower() in {'1', 'true', 'yes'}
        payout_status = str(self.request.query_params.get('payout_status', '')).strip().lower()
        search_term = str(self.request.query_params.get('search', '')).strip()
        date_from_raw = str(self.request.query_params.get('date_from', '')).strip()
        date_to_raw = str(self.request.query_params.get('date_to', '')).strip()
        min_amount_raw = str(self.request.query_params.get('min_amount', '')).strip()
        max_amount_raw = str(self.request.query_params.get('max_amount', '')).strip()
        sort = str(self.request.query_params.get('sort', 'latest')).strip().lower()

        if financial_only:
            qs = qs.filter(status__in=['Confirmed', 'Completed'])

        needs_payout_annotation = (
            financial_only
            or payout_status in {'settled', 'pending'}
            or bool(min_amount_raw or max_amount_raw)
            or sort in {'amount_desc', 'amount_asc'}
        )

        if needs_payout_annotation:
            commission_fallback = ExpressionWrapper(
                F('total_price') * Value(Decimal('0.02')),
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )
            commission_expr = Coalesce(
                F('platform_fee'),
                commission_fallback,
                output_field=DecimalField(max_digits=12, decimal_places=2),
            )

            qs = qs.annotate(
                effective_payout=Case(
                    When(guide_payout_amount__gt=0, then=F('guide_payout_amount')),
                    default=ExpressionWrapper(
                        F('down_payment') - commission_expr,
                        output_field=DecimalField(max_digits=12, decimal_places=2),
                    ),
                    output_field=DecimalField(max_digits=12, decimal_places=2),
                )
            )

            if financial_only:
                qs = qs.filter(effective_payout__gt=0)

        if payout_status == 'settled':
            qs = qs.filter(is_payout_settled=True)
        elif payout_status == 'pending':
            qs = qs.filter(is_payout_settled=False)

        def parse_iso_date(raw_value):
            if not raw_value:
                return None
            try:
                return datetime.fromisoformat(raw_value).date()
            except ValueError:
                try:
                    return date.fromisoformat(raw_value)
                except ValueError:
                    return None

        parsed_from = parse_iso_date(date_from_raw)
        parsed_to = parse_iso_date(date_to_raw)

        if parsed_from:
            qs = qs.filter(created_at__date__gte=parsed_from)
        if parsed_to:
            qs = qs.filter(created_at__date__lte=parsed_to)

        if search_term:
            search_filter = (
                Q(tourist__first_name__icontains=search_term)
                | Q(tourist__last_name__icontains=search_term)
                | Q(destination__name__icontains=search_term)
                | Q(accommodation__title__icontains=search_term)
            )

            if search_term.isdigit():
                search_filter = search_filter | Q(id=int(search_term))

            qs = qs.filter(search_filter)

        if min_amount_raw and needs_payout_annotation:
            try:
                qs = qs.filter(effective_payout__gte=Decimal(min_amount_raw))
            except Exception:
                pass

        if max_amount_raw and needs_payout_annotation:
            try:
                qs = qs.filter(effective_payout__lte=Decimal(max_amount_raw))
            except Exception:
                pass

        if sort == 'oldest':
            return qs.order_by('created_at')
        if sort == 'amount_desc' and needs_payout_annotation:
            return qs.order_by('-effective_payout', '-created_at')
        if sort == 'amount_asc' and needs_payout_annotation:
            return qs.order_by('effective_payout', '-created_at')

        return qs.order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='agency-concurrent-bookings')
    def agency_concurrent_bookings(self, request):
        agency_id_raw = request.query_params.get('agency_id')
        if not agency_id_raw:
            return Response({'detail': 'agency_id is required.'}, status=400)

        try:
            agency_id = int(agency_id_raw)
        except (TypeError, ValueError):
            return Response({'detail': 'agency_id must be a valid integer.'}, status=400)

        if agency_id <= 0:
            return Response({'detail': 'agency_id must be a positive integer.'}, status=400)

        def parse_iso_date(raw_value):
            if not raw_value:
                return None
            try:
                return date.fromisoformat(str(raw_value))
            except (TypeError, ValueError):
                return None

        check_in = parse_iso_date(request.query_params.get('check_in'))
        check_out = parse_iso_date(request.query_params.get('check_out'))

        if not check_in:
            return Response({'detail': 'check_in is required in YYYY-MM-DD format.'}, status=400)

        if not check_out:
            check_out = check_in

        if check_out < check_in:
            return Response({'detail': 'check_out cannot be earlier than check_in.'}, status=400)

        queryset = Booking.objects.select_related('tourist').filter(
            agency_id=agency_id,
            check_in__lte=check_out,
            check_out__gte=check_in,
            status__in=['Accepted', 'Pending_Payment', 'Confirmed', 'Completed'],
        )

        destination_id_raw = request.query_params.get('destination_id')
        if destination_id_raw:
            try:
                destination_id = int(destination_id_raw)
            except (TypeError, ValueError):
                return Response({'detail': 'destination_id must be a valid integer.'}, status=400)

            if destination_id > 0:
                queryset = queryset.filter(destination_id=destination_id)

        exclude_booking_id_raw = request.query_params.get('exclude_booking_id')
        if exclude_booking_id_raw:
            try:
                exclude_booking_id = int(exclude_booking_id_raw)
            except (TypeError, ValueError):
                return Response({'detail': 'exclude_booking_id must be a valid integer.'}, status=400)

            if exclude_booking_id > 0:
                queryset = queryset.exclude(id=exclude_booking_id)

        # The manifest is intended to show "other people" already booked on the same dates.
        queryset = queryset.exclude(tourist=request.user).order_by('check_in', 'id')

        response_data = [
            {
                'id': booking.id,
                'tourist_username': booking.tourist.username if booking.tourist else 'Guest',
                'num_guests': booking.num_guests,
                'check_in': booking.check_in,
                'check_out': booking.check_out,
                'meetup_location': booking.meetup_location,
                'meetup_municipality': booking.meetup_municipality,
                'meetup_latitude': booking.meetup_latitude,
                'meetup_longitude': booking.meetup_longitude,
                'status': booking.status,
            }
            for booking in queryset
        ]

        return Response(response_data)

    def perform_create(self, serializer):
        user = self.request.user

        uploaded_id_image = serializer.validated_data.get('tourist_valid_id_image')
        uploaded_selfie_image = serializer.validated_data.get('tourist_selfie_image')

        # Guard against malformed multipart payloads that produce empty/non-file values.
        def sanitize_uploaded_file(field_name, candidate):
            if not candidate:
                return None

            is_file_like = hasattr(candidate, 'read') and hasattr(candidate, 'name')
            if not is_file_like:
                serializer.validated_data.pop(field_name, None)
                return None

            size = getattr(candidate, 'size', None)
            if size is not None and size <= 0:
                serializer.validated_data.pop(field_name, None)
                return None

            return candidate

        uploaded_id_image = sanitize_uploaded_file('tourist_valid_id_image', uploaded_id_image)
        sanitize_uploaded_file('tourist_selfie_image', uploaded_selfie_image)

        if uploaded_id_image:
            user.valid_id_image = uploaded_id_image
            user.save(update_fields=['valid_id_image'])
            
            # FIX: Rewind the file pointer back to the start so it can be read again for the Booking model!
            uploaded_id_image.seek(0)

        passed_total = self.request.data.get('total_price')
        passed_down_payment = self.request.data.get('down_payment')
        passed_balance = self.request.data.get('balance_due')

        # 3. Detect Food Skip-Provider mode
        destination = serializer.validated_data.get('destination')
        is_food_skip = False
        if not serializer.validated_data.get('guide') and not serializer.validated_data.get('agency') and not serializer.validated_data.get('accommodation'):
            if destination and destination.category and 'food' in destination.category.lower():
                is_food_skip = True

        # Assign status Confirmed immediately for skip mode
        instance = serializer.save(tourist=user, status='Confirmed' if is_food_skip else 'Pending_Payment')

        requested_tour_id = self.request.data.get('tour_package_id')
        
        if requested_tour_id and requested_tour_id != 'null':
            candidates = TourPackage.objects.filter(id=requested_tour_id, main_destination=instance.destination)
            if instance.guide:
                candidates = candidates.filter(guide=instance.guide)
            elif instance.agency:
                candidates = candidates.filter(agency__user=instance.agency)
            
            selected_tour = candidates.first()
            if selected_tour:
                instance.tour_package = selected_tour
        
        # Zero out fields for skip mode bypassing standard pricing
        if is_food_skip:
            instance.total_price = Decimal('0.00')
            instance.down_payment = Decimal('0.00')
            instance.balance_due = Decimal('0.00')
            instance.downpayment_paid_at = timezone.now()
        elif passed_total and passed_down_payment and passed_balance:
            instance.total_price = Decimal(str(passed_total)).quantize(Decimal('0.01'))
            instance.down_payment = Decimal(str(passed_down_payment)).quantize(Decimal('0.01'))
            instance.balance_due = Decimal(str(passed_balance)).quantize(Decimal('0.01'))
        else:
            raw_total_price = self.calculate_booking_price(instance)
            total_price = Decimal(str(raw_total_price)).quantize(Decimal('0.01'))
            
            dp_percentage = Decimal('30.00')
            if instance.agency and hasattr(instance.agency, 'agency_profile'):
                dp_percentage = Decimal(str(instance.agency.agency_profile.down_payment_percentage))
            
            down_payment = (total_price * (dp_percentage / Decimal('100'))).quantize(Decimal('0.01'))
            balance_due = (total_price - down_payment).quantize(Decimal('0.01'))
            
            instance.total_price = total_price
            instance.down_payment = down_payment
            instance.balance_due = balance_due
            
        instance.save()
        self.validate_booking_target(instance)

        # 4. Provider notifications naturally guarded because provider resolves to None in skip mode.
        provider = instance.guide or instance.agency or (instance.accommodation.host if instance.accommodation else None)
        tourist_name = f"{user.first_name} {user.last_name}".strip() or user.username
        if provider and provider.email:
            try:
                booking_date_display = format_booking_date_display(instance.check_in, instance.check_out)
                
                itin_html, itin_plain = generate_itinerary_html_and_plain(instance)

                subject = "New Booking Request Received - LocaLynk"
                
                plain_message = (
                    f"Hi {provider.username},\n\n"
                    f"You have received a new booking request from {tourist_name}!\n\n"
                    f"Details:\n"
                    f"- Destination: {instance.destination or 'N/A'}\n"
                    f"- Dates: {booking_date_display}\n"
                    f"- Guests: {instance.num_guests}\n"
                    f"{itin_plain}\n\n"
                    f"This booking is currently 'Pending Payment'. You will receive another notification once the tourist completes their down payment.\n\n"
                    f"Please check your dashboard for more details."
                )

                html_message = f"""
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }}
                        .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }}
                        .header {{ background-color: #0072FF; padding: 20px; text-align: center; color: #ffffff; font-size: 22px; font-weight: bold; }}
                        .content {{ padding: 30px; font-size: 15px; color: #444; line-height: 1.5; }}
                        .details-box {{ background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0; }}
                        .btn {{ display: inline-block; background-color: #0072FF; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; text-align: center; }}
                        .footer {{ padding: 15px; text-align: center; color: #888; font-size: 12px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; }}
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">New Booking Request</div>
                        <div class="content">
                            <h2 style="color: #333; margin-top: 0;">Hi {provider.username},</h2>
                            <p>You have received a new booking request from <strong>{tourist_name}</strong>.</p>
                            
                            <div class="details-box">
                                <p style="margin: 5px 0;"><strong>Destination:</strong> {instance.destination or 'N/A'}</p>
                                <p style="margin: 5px 0;"><strong>Dates:</strong> {booking_date_display}</p>
                                <p style="margin: 5px 0;"><strong>Guests:</strong> {instance.num_guests}</p>
                                
                                <div style="display: inline-block; background-color: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; margin-top: 10px;">Pending Payment</div>
                                
                                {itin_html}
                            </div>

                            <p>The tourist is currently processing their down payment. We will notify you again once the payment is confirmed.</p>
                            
                            <div style="text-align: center;">
                                <a href="{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/portal" class="btn">View Dashboard</a>
                            </div>
                        </div>
                        <div class="footer">&copy; 2026 LocaLynk Partner Network.</div>
                    </div>
                </body>
                </html>
                """

                send_preference_aware_email(
                    subject=subject,
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[provider.email],
                    fail_silently=True,
                    html_message=html_message,
                )
            except Exception as e:
                print(f"Failed to send request notification email: {e}")

        if provider:
            provider_name = provider.get_full_name() or provider.username
            send_push_to_user(
                user=provider,
                title='New Booking Request',
                body=f"{tourist_name} sent a new booking request.",
                data=build_alert_push_data(
                    alert_type='new_booking_request',
                    related_model='Booking',
                    related_object_id=instance.id,
                    extra={'provider_name': provider_name},
                ),
                event_key=f"booking-request:{instance.id}",
            )
        
    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        user = request.user

        is_provider = (
            booking.guide == user or
            booking.agency == user or
            (booking.accommodation and booking.accommodation.host == user)
        )

        if not (user.is_superuser or is_provider):
            return Response(
                {"error": "Only Admins or the booking's assigned provider can delete this booking."},
                status=403,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def guide_blocked_dates(self, request):
        guide_id = request.query_params.get('guide_id')
        if not guide_id:
            return Response({"error": "guide_id is required"}, status=400)
            
        bookings = Booking.objects.filter(
            guide_id=guide_id, 
            status='Confirmed'
        ).values('check_in', 'check_out')
        
        blocked_dates = []
        for b in bookings:
            start = b['check_in']
            end = b['check_out']
            curr = start
            while curr <= end: 
                blocked_dates.append(curr.isoformat())
                curr += timedelta(days=1)
                
        return Response(blocked_dates)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        booking = self.get_object()
        user = request.user

        is_provider = (
            booking.guide == user or 
            booking.agency == user or 
            (booking.accommodation and booking.accommodation.host == user)
        )
        
        if not is_provider:
            return Response({"error": "Only the service provider can mark this as paid."}, status=403)

        booking.balance_due = 0
        booking.status = 'Completed' 
        booking.balance_paid_at = timezone.now()
        booking.save()

        SystemAlert.objects.create(
            target_type='Tourist',
            recipient=booking.tourist,
            title="Trip Completed / Paid",
            message=f"Your trip to {booking.destination or 'your destination'} has been marked as fully paid and completed. Thank you!",
            related_object_id=booking.id,
            related_model='Booking',
            is_read=False
        )

        send_push_to_user(
            user=booking.tourist,
            title='Trip Completed',
            body='Your trip has been marked completed. Thanks for using LocaLynk!',
            data=build_alert_push_data(
                alert_type='trip_completed',
                related_model='Booking',
                related_object_id=booking.id,
            ),
            event_key=f"trip-completed:{booking.id}",
        )

        provider_name = "LocaLynk"
        if booking.guide:
            provider_name = f"Guide {booking.guide.first_name}"
        elif booking.agency:
            agency_profile = getattr(booking.agency, 'agency_profile', None)
            agency_name = getattr(agency_profile, 'business_name', None) or booking.agency.username
            provider_name = f"Agency {agency_name}"

        booking_date_display = format_booking_date_display(booking.check_in, booking.check_out)
        
        itin_html, itin_plain = generate_itinerary_html_and_plain(booking)

        plain_text_receipt = (
            f"Hi {booking.tourist.username},\n\n"
            f"Your face-to-face payment has been fully processed and your booking is complete!\n"
            f"Total Paid: ₱{booking.total_price:,.2f}\n"
            f"Provider: {provider_name}\n"
            f"Dates: {booking_date_display}\n"
            f"{itin_plain}\n\n"
            f"Thank you for exploring with LocaLynk!"
        )

        html_receipt = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f7f6; margin: 0; padding: 20px; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }}
                .header {{ background-color: #10b981; padding: 20px; text-align: center; color: #ffffff; font-size: 22px; font-weight: bold; }}
                .content {{ padding: 30px; font-size: 15px; color: #444; line-height: 1.5; }}
                .summary-box {{ border-bottom: 1px dashed #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }}
                .summary-title {{ font-size: 13px; font-weight: bold; color: #888; text-transform: uppercase; margin-bottom: 10px; }}
                .total-amount {{ font-size: 24px; font-weight: bold; color: #10b981; text-align: right; margin-top: 15px; }}
                .footer {{ padding: 15px; text-align: center; color: #888; font-size: 12px; background-color: #f8fafc; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">Payment Receipt</div>
                <div class="content">
                    <h2 style="color: #333; margin-top: 0; text-align: center;">Trip Completed!</h2>
                    <p style="text-align: center; margin-bottom: 30px;">Hi <strong>{booking.tourist.username}</strong>, your face-to-face payment has been verified by your provider.</p>
                    
                    <div class="summary-box">
                        <div class="summary-title">Booking Details</div>
                        <p style="margin: 5px 0;"><strong>Destination:</strong> {booking.destination or 'N/A'}</p>
                        <p style="margin: 5px 0;"><strong>Provider:</strong> {provider_name}</p>
                        <p style="margin: 5px 0;"><strong>Dates:</strong> {booking_date_display}</p>
                        {itin_html}
                    </div>
                    
                    <div>
                        <div class="summary-title">Settlement Summary</div>
                        <div class="total-amount">Total Trip Value: &#8369; {booking.total_price:,.2f}</div>
                        <p style="text-align: right; font-size: 12px; color: #888; margin-top: 5px;">(Including initial down payment)</p>
                    </div>
                </div>
                <div class="footer">&copy; 2026 LocaLynk. Thank you for exploring with us!</div>
            </div>
        </body>
        </html>
        """

        try:
            send_preference_aware_email(
                subject=f"Receipt: Your LocaLynk Trip to {booking.destination or 'your destination'}",
                message=plain_text_receipt,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[booking.tourist.email],
                html_message=html_receipt,
                fail_silently=True, 
            )
        except Exception as e:
            print(f"Failed to send receipt email: {e}")

        return Response(self.get_serializer(booking).data)

    @action(detail=True, methods=['post'])
    def settle_payout(self, request, pk=None):
        if not (request.user.is_staff or request.user.is_superuser):
            return Response({'error': 'Only admins can settle payouts.'}, status=403)

        booking = self.get_object()
        if booking.status not in ['Confirmed', 'Completed']:
            return Response({'error': 'Only confirmed or completed bookings can be settled.'}, status=400)

        requested_channel = str(request.data.get('payout_channel') or booking.payout_channel or 'GCash').strip()
        valid_channels = {choice[0] for choice in Booking.PAYOUT_CHANNEL_CHOICES}
        if requested_channel not in valid_channels:
            return Response({'error': 'Invalid payout channel.'}, status=400)

        if Decimal(str(booking.guide_payout_amount or 0)) <= 0:
            platform_fee = Decimal(str(booking.platform_fee or 0))
            if platform_fee <= 0:
                platform_fee = Decimal(str(booking.total_price or 0)) * Decimal('0.02')

            down_payment = Decimal(str(booking.down_payment or 0))
            booking.guide_payout_amount = max(Decimal('0.00'), down_payment - platform_fee)

        raw_reference = str(request.data.get('payout_reference_id') or '').strip()

        booking.is_payout_settled = True
        booking.payout_settled_at = timezone.now()
        booking.payout_channel = requested_channel
        booking.payout_reference_id = raw_reference or None
        booking.payout_processed_by = request.user
        booking.save(update_fields=[
            'is_payout_settled',
            'payout_settled_at',
            'payout_channel',
            'payout_reference_id',
            'payout_processed_by',
            'guide_payout_amount',
        ])

        return Response(self.get_serializer(booking).data, status=200)

    def create_booking_alert(self, booking):
        if booking.status != 'Confirmed':
            return

        try:
            recipient = None
            if booking.guide:
                recipient = booking.guide
            elif booking.agency:
                recipient = booking.agency
            elif booking.accommodation:
                recipient = booking.accommodation.host

            if recipient:
                tourist_name = f"{booking.tourist.first_name} {booking.tourist.last_name}".strip() or booking.tourist.username
                SystemAlert.objects.create(
                    recipient=recipient,
                    target_type='Guide',
                    title="New Confirmed Booking", 
                    message=f"New trip confirmed! {tourist_name} for {booking.check_in}. Check your schedule.",
                    related_object_id=booking.id,
                    related_model='Booking',
                    is_read=False
                )

                send_push_to_user(
                    user=recipient,
                    title='New Confirmed Booking',
                    body=f"{tourist_name} has a confirmed trip on {booking.check_in}.",
                    data=build_alert_push_data(
                        alert_type='booking_confirmed',
                        related_model='Booking',
                        related_object_id=booking.id,
                    ),
                    event_key=f"booking-confirmed:{booking.id}",
                )
        except Exception as e:
            print(f"Error creating booking alert: {e}")

    def validate_booking_target(self, instance):
        target = None
        if instance.guide:
            if instance.guide.guide_tier == 'free' and instance.guide.booking_count >= 1:
                raise ValidationError("This guide is not accepting new bookings (Limit Reached).")
            target = instance.guide
            if not target or not (target.is_local_guide and target.guide_approved):
                raise ValidationError("Target is not an approved guide.")
        
        if instance.accommodation:
            host_user = instance.accommodation.host
            agency_profile = instance.accommodation.agency

            has_approved_host = bool(
                host_user and host_user.is_local_guide and host_user.guide_approved
            )
            has_approved_agency_owner = bool(
                agency_profile and
                getattr(agency_profile, 'status', None) == 'Approved' and
                getattr(agency_profile, 'user', None) and
                agency_profile.user.is_staff
            )

            if not (has_approved_host or has_approved_agency_owner):
                raise ValidationError("Target accommodation is not owned by an approved guide/host/agency.")
        if instance.agency:
            target = instance.agency
            if not target or not target.is_staff:
                raise ValidationError("Target is not an agency.")

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user
        
        if user.is_staff or user.is_superuser:
            serializer.save()
            return

        if user == instance.tourist and 'status' in self.request.data:
            if self.request.data['status'] == 'Cancelled':
                instance.status = 'Cancelled'
                instance.save()
                return 
            raise PermissionDenied("You can only cancel your own booking.")
            
        raise PermissionDenied("Use the status endpoint for updates.")

    def calculate_booking_price(self, instance):
        if not instance.check_in or not instance.check_out:
            return 0
        
        days = max((instance.check_out - instance.check_in).days + 1, 1)
        total_price = 0

        if instance.accommodation:
            acc_cost = instance.accommodation.price * days
            total_price += acc_cost
        
        provider = instance.guide or instance.agency
        
        if provider:
            tour_package = instance.tour_package
            requested_tour_id = self.request.data.get('tour_package_id')
            
            if not tour_package and requested_tour_id and requested_tour_id != 'null':
                tour_package = TourPackage.objects.filter(id=requested_tour_id).first()
            
            if not tour_package and instance.destination:
                candidates = TourPackage.objects.filter(
                    main_destination=instance.destination,
                    duration_days__in=[days, max(days - 1, 1)],
                    is_active=True,
                )
                if instance.guide:
                    candidates = candidates.filter(guide=instance.guide)
                elif instance.agency:
                    candidates = candidates.filter(agency__user=instance.agency)
                
                tour_package = candidates.order_by('-created_at').first()
            
            base_group_price = getattr(provider, 'price_per_day', 0) or 0
            solo_price = getattr(provider, 'solo_price_per_day', base_group_price) or base_group_price
            extra_fee = getattr(provider, 'multiple_additional_fee_per_head', 0) or 0
            
            if tour_package:
                base_group_price = tour_package.price_per_day or base_group_price
                solo_price = tour_package.solo_price or solo_price
                extra_fee = tour_package.additional_fee_per_head or 0
            
            if instance.num_guests == 1:
                daily_rate = solo_price 
            else:
                extra_pax = max(0, instance.num_guests - 1)
                daily_rate = solo_price + (extra_pax * extra_fee) 
            
            tour_total = daily_rate * days
            total_price += tour_total

        return float(total_price)


class BookingStatusUpdateView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def get_object(self):
        booking = super().get_object()
        user = self.request.user
        is_participant = (
            booking.tourist == user or 
            booking.guide == user or
            (booking.accommodation and booking.accommodation.host == user) or
            booking.agency == user
        )
        
        if not (is_participant or user.is_superuser):
            raise PermissionDenied("You cannot manage this booking.")
        return booking

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        new_status = request.data.get('status')
        if not new_status:
            raise ValidationError({"status": "Status is required."})

        if new_status == 'Confirmed':
            try:
                instance.clean()
            except ValidationError as e:
                return Response({"error": "Dates are no longer available."}, status=400)

            instance.status = 'Confirmed'
            if not instance.downpayment_paid_at:
                instance.downpayment_paid_at = timezone.now()

            if instance.guide:
                instance.guide.booking_count += 1
                instance.guide.save()
            instance.save()
            BookingViewSet().create_booking_alert(instance)
            return Response(self.get_serializer(instance).data)

        if new_status == 'Cancelled':
            instance.status = 'Cancelled'
            instance.save()
            return Response(self.get_serializer(instance).data)
            
        if new_status == 'Accepted':
             if instance.guide:
                instance.guide.booking_count += 1
                instance.guide.save()
             
             meetup_loc = request.data.get('meetup_location')
             meetup_municipality = request.data.get('meetup_municipality')
             meetup_latitude = request.data.get('meetup_latitude')
             meetup_longitude = request.data.get('meetup_longitude')
             meetup_time = request.data.get('meetup_time')
             meetup_inst = request.data.get('meetup_instructions')

             has_location_payload = any(
                 value not in (None, '')
                 for value in [meetup_loc, meetup_municipality, meetup_latitude, meetup_longitude]
             )

             if has_location_payload:
                 try:
                     normalized = validate_zds_location_payload(
                         location=meetup_loc,
                         latitude=meetup_latitude,
                         longitude=meetup_longitude,
                         municipality=meetup_municipality,
                         require_location=True,
                     )
                 except ValueError as exc:
                     raise ValidationError({'meetup_location': str(exc)})

                 instance.meetup_location = normalized['location']
                 instance.meetup_municipality = normalized['municipality'] or None
                 instance.meetup_latitude = normalized['latitude']
                 instance.meetup_longitude = normalized['longitude']
             
             if meetup_time:
                 instance.meetup_time = meetup_time
             if meetup_inst:
                 instance.meetup_instructions = meetup_inst
             instance.status = 'Accepted'
             instance.save()
             return Response(self.get_serializer(instance).data)

        if new_status == 'Declined':
             instance.status = 'Declined'
             instance.save()
             return Response(self.get_serializer(instance).data)

        return Response(
            {"status": f"Invalid status transition to '{new_status}'."},
            status=status.HTTP_400_BAD_REQUEST
        )


class AssignGuidesView(generics.UpdateAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def update(self, request, *args, **kwargs):
        booking = self.get_object()
        user = self.request.user
        
        is_owner = booking.agency == user
        is_superuser = user.is_superuser
        can_claim = (booking.agency is None) and user.is_staff
        
        if not (is_owner or is_superuser or can_claim):
             raise PermissionDenied(f"You are not the agency for this booking. (Agency: {booking.agency}, You: {user.username})")
        
        if can_claim and not is_owner:
            booking.agency = user
            booking.guide = None
            booking.accommodation = None
            booking.save()

        agency_guide_ids = request.data.get('agency_guide_ids', [])
        
        booking.assigned_agency_guides.clear()
        for guide_id in agency_guide_ids:
            booking.assigned_agency_guides.add(guide_id)
            
        return Response(self.get_serializer(booking).data)

class CleanupZombieBookingsView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        expected_key = getattr(settings, 'CRON_SECRET_KEY')
        provided_key = request.GET.get('key') or request.headers.get('Authorization')

        if provided_key != expected_key:
            return Response({"error": "Unauthorized access"}, status=403)

        threshold_time = timezone.now() - timedelta(minutes=30)
        zombie_bookings = Booking.objects.filter(
            status='Pending_Payment',
            created_at__lt=threshold_time
        )
        
        count = zombie_bookings.count()
        if count > 0:
            zombie_bookings.delete()
            return Response({"status": "success", "message": f"Successfully deleted {count} zombie bookings."})
        
        return Response({"status": "success", "message": "No zombie bookings found."})