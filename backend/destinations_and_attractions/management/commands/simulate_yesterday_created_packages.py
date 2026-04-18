from django.core.management.base import BaseCommand
from datetime import timedelta

from destinations_and_attractions.models import TourPackage
from destinations_and_attractions.views import _get_previous_day_window


class Command(BaseCommand):
    help = "Simulate TourPackage created_at timestamps for yesterday (for testing analytics)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dest_id",
            type=int,
            required=True,
            help="Destination ID to simulate"
        )

    def handle(self, *args, **options):
        dest_id = options["dest_id"]

        pkgs = list(
            TourPackage.objects
            .filter(main_destination_id=dest_id, is_active=True)
            .order_by("-id")
        )

        start_prev, start_today, target_date = _get_previous_day_window()

        if not pkgs:
            self.stdout.write(self.style.WARNING(
                f"No active packages for destination {dest_id}"
            ))
            return

        # Simulate timestamps
        if len(pkgs) >= 1:
            TourPackage.objects.filter(id=pkgs[0].id).update(
                created_at=start_prev + timedelta(hours=8)
            )

        if len(pkgs) >= 2:
            TourPackage.objects.filter(id=pkgs[1].id).update(
                created_at=start_prev + timedelta(hours=12)
            )

        if len(pkgs) >= 3:
            TourPackage.objects.filter(id=pkgs[2].id).update(
                created_at=start_today + timedelta(hours=1)
            )

        y_count = TourPackage.objects.filter(
            main_destination_id=dest_id,
            is_active=True,
            created_at__gte=start_prev,
            created_at__lt=start_today
        ).count()

        self.stdout.write(self.style.SUCCESS("=== Simulation Complete ==="))
        self.stdout.write(f"Destination: {dest_id}")
        self.stdout.write(f"Target date: {target_date}")
        self.stdout.write(f"Yesterday count: {y_count}")