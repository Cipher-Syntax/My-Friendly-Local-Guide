from django.db import migrations, models


def backfill_specializations(apps, schema_editor):
    TouristGuide = apps.get_model('agency_management_module', 'TouristGuide')

    for guide in TouristGuide.objects.all().iterator():
        legacy_specialization = str(getattr(guide, 'specialization', '') or '').strip()
        existing_specializations = getattr(guide, 'specializations', []) or []

        normalized = []
        seen = set()

        for value in existing_specializations:
            token = str(value or '').strip()
            if not token:
                continue
            key = token.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(token)

        if legacy_specialization and legacy_specialization.lower() not in seen:
            normalized.insert(0, legacy_specialization)

        if normalized != existing_specializations:
            guide.specializations = normalized
            guide.save(update_fields=['specializations'])


class Migration(migrations.Migration):

    dependencies = [
        ('agency_management_module', '0010_agency_available_days_agency_closing_time_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='touristguide',
            name='specializations',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.RunPython(backfill_specializations, migrations.RunPython.noop),
    ]
