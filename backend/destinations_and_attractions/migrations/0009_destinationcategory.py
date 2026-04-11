from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('destinations_and_attractions', '0008_tourpackage_agency_alter_tourpackage_guide'),
    ]

    operations = [
        migrations.CreateModel(
            name='DestinationCategory',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=50, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
    ]
