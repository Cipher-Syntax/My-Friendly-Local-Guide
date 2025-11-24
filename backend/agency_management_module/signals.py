# app/signals.py

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Agency, TouristGuide


@receiver(post_save, sender=Agency)
def sync_guides_with_agency_approval(sender, instance, **kwargs):
    # WHY: Keep guides active only if the agency is active.
    if not instance.is_approved:
        TouristGuide.objects.filter(agency=instance).update(is_active=False)
    else:
        TouristGuide.objects.filter(agency=instance).update(is_active=True)
