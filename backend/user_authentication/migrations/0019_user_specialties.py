from django.db import migrations, models


def backfill_specialties(apps, schema_editor):
    User = apps.get_model('user_authentication', 'User')

    for user in User.objects.all().iterator():
        legacy_specialty = str(getattr(user, 'specialty', '') or '').strip()
        existing_specialties = getattr(user, 'specialties', []) or []

        normalized = []
        seen = set()

        for value in existing_specialties:
            token = str(value or '').strip()
            if not token:
                continue
            key = token.lower()
            if key in seen:
                continue
            seen.add(key)
            normalized.append(token)

        if legacy_specialty and legacy_specialty.lower() not in seen:
            normalized.insert(0, legacy_specialty)

        if normalized != existing_specialties:
            user.specialties = normalized
            user.save(update_fields=['specialties'])


class Migration(migrations.Migration):

    dependencies = [
        ('user_authentication', '0018_user_location_coordinates'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='specialties',
            field=models.JSONField(blank=True, default=list, help_text='List of guiding specialties'),
        ),
        migrations.RunPython(backfill_specialties, migrations.RunPython.noop),
    ]
