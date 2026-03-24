from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from agency_management_module.models import Agency, TouristGuide
from user_authentication.phone_utils import normalize_ph_phone


class Command(BaseCommand):
    help = "Normalize stored PH mobile numbers to +639XXXXXXXXX format."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would change without saving updates.",
        )

    def _normalize_queryset(self, queryset, field_name, label, dry_run=False):
        scanned = 0
        updated = 0
        skipped_blank = 0
        invalid = 0

        for obj in queryset.iterator():
            scanned += 1
            current = getattr(obj, field_name, None)

            if current is None or str(current).strip() == "":
                skipped_blank += 1
                continue

            try:
                normalized = normalize_ph_phone(current, field_name)
            except Exception:
                invalid += 1
                continue

            if normalized == current:
                continue

            updated += 1
            if not dry_run:
                setattr(obj, field_name, normalized)
                obj.save(update_fields=[field_name])

        self.stdout.write(
            f"[{label}] scanned={scanned} updated={updated} blank={skipped_blank} invalid={invalid}"
        )

        return {
            "scanned": scanned,
            "updated": updated,
            "blank": skipped_blank,
            "invalid": invalid,
        }

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", False)
        User = get_user_model()

        self.stdout.write(
            self.style.WARNING("Running in DRY-RUN mode. No records will be saved.")
            if dry_run
            else self.style.SUCCESS("Applying phone normalization updates.")
        )

        totals = {
            "scanned": 0,
            "updated": 0,
            "blank": 0,
            "invalid": 0,
        }

        chunks = [
            self._normalize_queryset(User.objects.all(), "phone_number", "User.phone_number", dry_run),
            self._normalize_queryset(Agency.objects.all(), "phone", "Agency.phone", dry_run),
            self._normalize_queryset(TouristGuide.objects.all(), "contact_number", "TouristGuide.contact_number", dry_run),
        ]

        for chunk in chunks:
            for key in totals:
                totals[key] += chunk[key]

        summary = (
            f"Total scanned={totals['scanned']} updated={totals['updated']} "
            f"blank={totals['blank']} invalid={totals['invalid']}"
        )

        if dry_run:
            self.stdout.write(self.style.WARNING(summary))
            self.stdout.write(self.style.WARNING("Re-run without --dry-run to apply updates."))
        else:
            self.stdout.write(self.style.SUCCESS(summary))