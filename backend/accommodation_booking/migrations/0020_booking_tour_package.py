from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('destinations_and_attractions', '0007_tourpackage_duration_days'),
        ('accommodation_booking', '0019_booking_additional_guest_names'),
    ]

    operations = [
        migrations.AddField(
            model_name='booking',
            name='tour_package',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='bookings', to='destinations_and_attractions.tourpackage'),
        ),
    ]
