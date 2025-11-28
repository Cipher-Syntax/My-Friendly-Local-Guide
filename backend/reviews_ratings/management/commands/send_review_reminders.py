from django.core.management.base import BaseCommand
from django.utils import timezone
from accommodation_booking.models import Booking
from reviews_ratings.models import Review, DestinationReview
from system_management_module.models import SystemAlert
from destinations_and_attractions.models import Destination

class Command(BaseCommand):
    help = 'Sends review reminders for completed bookings that have not yet been reviewed.'

    def handle(self, *args, **kwargs):
        # Get bookings that are completed, ended in the past, and haven't had a notification sent yet
        completed_bookings = Booking.objects.filter(
            status='Completed',
            check_out__lt=timezone.now().date(),
            review_notification_sent=False
        ).select_related('tourist', 'guide', 'accommodation', 'accommodation__destination', 'destination')

        self.stdout.write(self.style.SUCCESS(f'Found {completed_bookings.count()} completed bookings to process.'))

        for booking in completed_bookings:
            send_notification = False

            # 1. Check if a guide review is needed and if it exists
            if booking.guide:
                guide_review_exists = Review.objects.filter(reviewer=booking.tourist, reviewed_user=booking.guide).exists()
                if not guide_review_exists:
                    send_notification = True

            # 2. Determine the destination and check if a review is needed
            # A booking can have a destination directly (for guides) or via an accommodation.
            booking_destination = booking.destination or (booking.accommodation and booking.accommodation.destination)
            
            if booking_destination:
                destination_review_exists = DestinationReview.objects.filter(
                    reviewer=booking.tourist, 
                    destination=booking_destination
                ).exists()
                if not destination_review_exists:
                    send_notification = True
            
            # 3. If a notification is warranted, create the alert and mark the booking
            if send_notification:
                SystemAlert.objects.create(
                    recipient=booking.tourist,
                    target_type='Tourist',
                    title='How was your trip?',
                    message='Please take a moment to review your recent trip. Your feedback is valuable!',
                    related_object_id=booking.id,
                    related_model='Booking'
                )

                booking.review_notification_sent = True
                booking.save(update_fields=['review_notification_sent'])

                self.stdout.write(self.style.SUCCESS(f'Sent review reminder for Booking ID {booking.id}'))
            else:
                # If no notification is needed (e.g., reviews already exist), just mark it as processed.
                booking.review_notification_sent = True
                booking.save(update_fields=['review_notification_sent'])
                self.stdout.write(self.style.NOTICE(f'Booking ID {booking.id} already fully reviewed or not applicable. Marked as sent.'))

        self.stdout.write(self.style.SUCCESS('Finished sending review reminders.'))
