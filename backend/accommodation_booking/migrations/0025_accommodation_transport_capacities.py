from django.db import migrations, models


def backfill_transport_capacities(apps, schema_editor):
    Accommodation = apps.get_model('accommodation_booking', 'Accommodation')
    for accommodation in Accommodation.objects.all().iterator():
        capacity = getattr(accommodation, 'transport_capacity', None)
        if isinstance(capacity, int) and capacity > 0:
            accommodation.transport_capacities = [capacity]
        else:
            accommodation.transport_capacities = []
        accommodation.save(update_fields=['transport_capacities'])


def reverse_backfill_transport_capacities(apps, schema_editor):
    Accommodation = apps.get_model('accommodation_booking', 'Accommodation')
    for accommodation in Accommodation.objects.all().iterator():
        capacities = accommodation.transport_capacities if isinstance(accommodation.transport_capacities, list) else []
        normalized = []
        seen = set()

        for raw in capacities:
            try:
                value = int(raw)
            except (TypeError, ValueError):
                continue
            if value <= 0 or value in seen:
                continue
            seen.add(value)
            normalized.append(value)

        accommodation.transport_capacity = normalized[0] if normalized else None
        accommodation.save(update_fields=['transport_capacity'])


class Migration(migrations.Migration):

    dependencies = [
        ('accommodation_booking', '0024_accommodation_and_booking_location_coordinates'),
    ]

    operations = [
        migrations.AddField(
            model_name='accommodation',
            name='transport_capacities',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_transport_capacities, reverse_backfill_transport_capacities),
    ]
