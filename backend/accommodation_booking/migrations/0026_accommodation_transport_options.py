from django.db import migrations, models


def backfill_transport_options(apps, schema_editor):
    Accommodation = apps.get_model('accommodation_booking', 'Accommodation')

    for accommodation in Accommodation.objects.all().iterator():
        vehicle_type = str(getattr(accommodation, 'vehicle_type', '') or '').strip()
        capacities_raw = getattr(accommodation, 'transport_capacities', [])

        if not isinstance(capacities_raw, list):
            capacities_raw = [getattr(accommodation, 'transport_capacity', None)]

        capacities = []
        seen = set()
        for value in capacities_raw:
            try:
                parsed = int(value)
            except (TypeError, ValueError):
                continue
            if parsed <= 0 or parsed in seen:
                continue
            seen.add(parsed)
            capacities.append(parsed)

        if vehicle_type and capacities:
            accommodation.transport_options = [
                {
                    'vehicle_type': vehicle_type,
                    'transport_capacities': capacities,
                }
            ]
        else:
            accommodation.transport_options = []

        accommodation.save(update_fields=['transport_options'])


def reverse_backfill_transport_options(apps, schema_editor):
    Accommodation = apps.get_model('accommodation_booking', 'Accommodation')

    for accommodation in Accommodation.objects.all().iterator():
        transport_options = accommodation.transport_options if isinstance(accommodation.transport_options, list) else []
        first = transport_options[0] if transport_options else {}

        vehicle_type = str(first.get('vehicle_type', '') or '').strip()
        capacities_raw = first.get('transport_capacities', []) if isinstance(first, dict) else []

        capacities = []
        seen = set()
        for value in capacities_raw if isinstance(capacities_raw, list) else []:
            try:
                parsed = int(value)
            except (TypeError, ValueError):
                continue
            if parsed <= 0 or parsed in seen:
                continue
            seen.add(parsed)
            capacities.append(parsed)

        accommodation.vehicle_type = vehicle_type
        accommodation.transport_capacities = capacities
        accommodation.transport_capacity = capacities[0] if capacities else None
        accommodation.save(update_fields=['vehicle_type', 'transport_capacities', 'transport_capacity'])


class Migration(migrations.Migration):

    dependencies = [
        ('accommodation_booking', '0025_accommodation_transport_capacities'),
    ]

    operations = [
        migrations.AddField(
            model_name='accommodation',
            name='transport_options',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_transport_options, reverse_backfill_transport_options),
    ]
