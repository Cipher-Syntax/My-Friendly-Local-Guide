from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accommodation_booking.models import Booking

class Command(BaseCommand):
    help = 'Cancels booking requests that have been pending payment for more than 30 minutes.'

    def handle(self, *args, **kwargs):
        threshold_time = timezone.now() - timedelta(minutes=30)
        
        zombie_bookings = Booking.objects.filter(
            status='Pending_Payment',
            created_at__lt=threshold_time
        )
        
        count = zombie_bookings.count()
        
        if count > 0:
            zombie_bookings.update(status='Cancelled')
            self.stdout.write(self.style.SUCCESS(f'Successfully cancelled {count} zombie bookings.'))
        else:
            self.stdout.write(self.style.SUCCESS('No zombie bookings found.'))