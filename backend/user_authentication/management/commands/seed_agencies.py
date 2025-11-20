from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with agency users.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Seeding agencies...'))

        agencies_data = [
            {
                'username': 'sunshinetours',
                'email': 'sunshine@example.com',
                'password': 'password123',
                'first_name': 'Sunshine',
                'last_name': 'Tours',
                'bio': 'Reliable and friendly tour agency specializing in outdoor adventures.',
                'profile_picture': 'https://picsum.photos/200/300?random=1',
            },
            {
                'username': 'adventureseekers',
                'email': 'adventure@example.com',
                'password': 'password123',
                'first_name': 'Adventure',
                'last_name': 'Seekers',
                'bio': 'For thrill-seekers and adventure lovers seeking unforgettable experiences.',
                'profile_picture': 'https://picsum.photos/200/300?random=2',
            },
            {
                'username': 'cityexplorers',
                'email': 'city@example.com',
                'password': 'password123',
                'first_name': 'City',
                'last_name': 'Explorers',
                'bio': 'Explore cities and urban landmarks with our knowledgeable guides.',
                'profile_picture': 'https://picsum.photos/200/300?random=3',
            },
        ]

        for agency_data in agencies_data:
            if not User.objects.filter(username=agency_data['username']).exists():
                user = User.objects.create_user(
                    username=agency_data['username'],
                    email=agency_data['email'],
                    password=agency_data['password'],
                    first_name=agency_data['first_name'],
                    last_name=agency_data['last_name'],
                    bio=agency_data['bio'],
                    profile_picture=agency_data['profile_picture'],
                    is_staff=True,  # Mark as staff for agency role
                    is_active=True,
                )
                self.stdout.write(self.style.SUCCESS(f'Successfully created agency: {user.username}'))
            else:
                self.stdout.write(self.style.WARNING(f'Agency already exists: {agency_data["username"]}'))

        self.stdout.write(self.style.SUCCESS('Agency seeding complete.'))
