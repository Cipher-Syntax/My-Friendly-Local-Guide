from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from agency_management_module.models import Agency # Import Agency Model

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the database with agency users AND profiles.'

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
                'business_name': 'Sunshine Tours Inc.', # Agency Field
                'owner_name': 'Mr. Sunshine',           # Agency Field
                'phone': '09123456789',                 # Agency Field
            },
            {
                'username': 'adventureseekers',
                'email': 'adventure@example.com',
                'password': 'password123',
                'first_name': 'Adventure',
                'last_name': 'Seekers',
                'bio': 'For thrill-seekers and adventure lovers seeking unforgettable experiences.',
                'business_name': 'Adventure Seekers Co.',
                'owner_name': 'John Adventurer',
                'phone': '09987654321',
            },
            {
                'username': 'cityexplorers',
                'email': 'city@example.com',
                'password': 'password123',
                'first_name': 'City',
                'last_name': 'Explorers',
                'bio': 'Explore cities and urban landmarks with our knowledgeable guides.',
                'business_name': 'City Explorers Ltd.',
                'owner_name': 'Jane City',
                'phone': '09112223333',
            },
        ]

        for data in agencies_data:
            # 1. Create or Get the User
            if not User.objects.filter(username=data['username']).exists():
                user = User.objects.create_user(
                    username=data['username'],
                    email=data['email'],
                    password=data['password'],
                    first_name=data['first_name'],
                    last_name=data['last_name'],
                    bio=data['bio'],
                    is_staff=True,  # Mark as staff/agency
                    is_active=True,
                )
                self.stdout.write(self.style.SUCCESS(f'User created: {user.username}'))
            else:
                user = User.objects.get(username=data['username'])

            # 2. Create the Agency Profile (Linked to User)
            # This is what makes them show up in "Agency Management"
            if not hasattr(user, 'agency_profile'):
                Agency.objects.create(
                    user=user,
                    business_name=data['business_name'],
                    owner_name=data['owner_name'],
                    email=data['email'],
                    phone=data['phone'],
                    is_approved=False # Set to False so you can approve them in Admin
                )
                self.stdout.write(self.style.SUCCESS(f'Agency Profile created for: {data["business_name"]}'))
            else:
                self.stdout.write(self.style.WARNING(f'Agency Profile already exists for: {user.username}'))

        self.stdout.write(self.style.SUCCESS('Agency seeding complete.'))