from django.db import models
from django.conf import settings 

User = settings.AUTH_USER_MODEL 


class Destination(models.Model):
    CATEGORY_CHOICES = [
        ('Cultural', 'Cultural'),
        ('Historical', 'Historical'),
        ('Adventure', 'Adventure'),
        ('Nature', 'Nature'),
        ('Beaches', 'Beaches'),
        ('Mountains', 'Mountains'),
        ('Rivers', 'Rivers'),
        ('Islands', 'Islands'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    is_featured = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class DestinationImage(models.Model):
    destination = models.ForeignKey(Destination, related_name='images', on_delete=models.CASCADE)
    image = models.ImageField(upload_to='destination_images/')
    caption = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"Image for {self.destination.name}"

class Attraction(models.Model):
    destination = models.ForeignKey(Destination, related_name='attractions', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField()
    photo = models.ImageField(upload_to='attractions/', blank=True, null=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)

    def __str__(self):
        return f"{self.name} ({self.destination.name})"


class TourPackage(models.Model):
    guide = models.ForeignKey(User, related_name='tours', on_delete=models.CASCADE)
    main_destination = models.ForeignKey(Destination, related_name='tour_packages', on_delete=models.SET_NULL, null=True, blank=True)
    
    name = models.CharField(max_length=255)
    description = models.TextField()
    
    duration = models.CharField(max_length=100)
    max_group_size = models.PositiveIntegerField()
    what_to_bring = models.TextField(blank=True, null=True)
    
    price_per_day = models.DecimalField(max_digits=10, decimal_places=2)
    solo_price = models.DecimalField(max_digits=10, decimal_places=2)
    additional_fee_per_head = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    itinerary_timeline = models.JSONField(default=list, blank=True) 

    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} by {self.guide.username}"

class TourStop(models.Model):
    tour = models.ForeignKey(TourPackage, related_name='stops', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    image = models.ImageField(upload_to='tour_stops/')
    order = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"{self.name} in {self.tour.name}"