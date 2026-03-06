from django.core.management.base import BaseCommand
from django.utils import timezone
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Deletes user accounts that have passed their scheduled deletion date (60 days after deactivation).'

    def handle(self, *args, **kwargs):
        now = timezone.now()
        
        expired_users = User.objects.filter(
            scheduled_deletion_date__lte=now,
            deactivated_at__isnull=False
        )
        
        count = expired_users.count()
        if count > 0:
            for user in expired_users:
                self.stdout.write(self.style.WARNING(f'Deleting expired account: {user.username} (Deactivated at: {user.deactivated_at})'))
            expired_users.delete()
            self.stdout.write(self.style.SUCCESS(f'Successfully deleted {count} expired account(s).'))
        else:
            self.stdout.write(self.style.SUCCESS('No expired accounts to delete today.'))