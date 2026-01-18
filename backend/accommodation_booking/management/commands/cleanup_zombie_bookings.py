from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accommodation_booking.models import Booking

class Command(BaseCommand):
    help = 'Deletes booking requests that have been pending payment for more than 30 minutes.'

    def handle(self, *args, **kwargs):
        # 1. Define the threshold (30 minutes ago)
        threshold_time = timezone.now() - timedelta(minutes=30)
        
        # 2. Find "Zombie" bookings
        # Status is 'Pending_Payment' AND created before the threshold
        zombie_bookings = Booking.objects.filter(
            status='Pending_Payment',
            created_at__lt=threshold_time
        )
        
        count = zombie_bookings.count()
        
        if count > 0:
            # 3. Delete them
            zombie_bookings.delete()
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} zombie bookings.'))
        else:
            self.stdout.write(self.style.SUCCESS('No zombie bookings found.'))