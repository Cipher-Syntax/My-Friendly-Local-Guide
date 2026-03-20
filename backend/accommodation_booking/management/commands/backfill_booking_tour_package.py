from django.core.management.base import BaseCommand #type: ignore
from django.db import transaction #type: ignore

from accommodation_booking.models import Booking
from destinations_and_attractions.models import TourPackage


class Command(BaseCommand):
    help = (
        'Backfill Booking.tour_package for old guide bookings. '
        'By default this runs as a dry-run and prints a summary only.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Persist matched tour_package values. Without this flag, command is dry-run.',
        )
        parser.add_argument(
            '--include-inactive',
            action='store_true',
            help='Also consider inactive TourPackage records when matching.',
        )
        parser.add_argument(
            '--allow-ambiguous-newest',
            action='store_true',
            help='If multiple packages match, choose newest by created_at instead of skipping.',
        )

    def handle(self, *args, **options):
        apply_changes = options['apply']
        include_inactive = options['include_inactive']
        allow_ambiguous_newest = options['allow_ambiguous_newest']

        bookings = Booking.objects.filter(
            guide__isnull=False,
            destination__isnull=False,
            tour_package__isnull=True,
        ).select_related('guide', 'destination')

        total = bookings.count()
        matched = 0
        updated = 0
        skipped_no_match = 0
        skipped_ambiguous = 0

        self.stdout.write(
            f'Scanning {total} booking(s) missing tour_package. Dry-run={not apply_changes}.'
        )

        with transaction.atomic():
            for booking in bookings.iterator():
                trip_days = max((booking.check_out - booking.check_in).days, 1)

                candidates = TourPackage.objects.filter(
                    guide=booking.guide,
                    main_destination=booking.destination,
                    duration_days=trip_days,
                )

                if not include_inactive:
                    candidates = candidates.filter(is_active=True)

                candidates = candidates.order_by('-created_at', '-id')
                candidate_count = candidates.count()

                if candidate_count == 0:
                    skipped_no_match += 1
                    continue

                selected = None
                if candidate_count == 1:
                    selected = candidates.first()
                elif allow_ambiguous_newest:
                    selected = candidates.first()
                else:
                    skipped_ambiguous += 1
                    continue

                matched += 1

                if apply_changes:
                    booking.tour_package = selected
                    booking.save(update_fields=['tour_package'])
                    updated += 1

            if not apply_changes:
                transaction.set_rollback(True)

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('Backfill summary:'))
        self.stdout.write(f'- total_missing: {total}')
        self.stdout.write(f'- matched: {matched}')
        self.stdout.write(f'- updated: {updated}')
        self.stdout.write(f'- skipped_no_match: {skipped_no_match}')
        self.stdout.write(f'- skipped_ambiguous: {skipped_ambiguous}')

        if not apply_changes:
            self.stdout.write('')
            self.stdout.write(
                self.style.WARNING(
                    'Dry-run only. Re-run with --apply to persist updates.'
                )
            )
