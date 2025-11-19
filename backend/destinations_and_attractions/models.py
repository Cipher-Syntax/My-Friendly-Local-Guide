# from django.db import models
# from django.conf import settings 

# # We get the custom User model defined in your user_auth app
# User = settings.AUTH_USER_MODEL 

# # ===============================================
# #          DESTINATION MODELS
# # ===============================================

# class Destination(models.Model):
#     CATEGORY_CHOICES = [
#         ('Cultural', 'Cultural'),
#         ('Historical', 'Historical'),
#         ('Adventure', 'Adventure'),
#         ('Nature', 'Nature'),
#     ]

#     # Core Fields
#     name = models.CharField(max_length=255)
#     description = models.TextField()
    
#     # Location Details
#     category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
#     location = models.CharField(max_length=255, help_text="e.g., Zamboanga City, Philippines")
#     latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
#     longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    
#     # Rating & Relationship to Guide
#     average_rating = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)
#     creator = models.ForeignKey(
#         User, 
#         related_name='created_destinations', 
#         on_delete=models.SET_NULL, 
#         blank=True, 
#         null=True,
#         help_text="The guide who created this destination listing"
#     )
#     created_at = models.DateTimeField(auto_now_add=True)

#     def __str__(self):
#         return self.name

# class DestinationImage(models.Model):
#     """
#     Model for holding multiple images associated with a Destination. 
#     This replaces the single 'photo' field on the Destination model.
#     """
#     destination = models.ForeignKey(Destination, related_name='images', on_delete=models.CASCADE)
#     image = models.ImageField(upload_to='destination_images/')
#     caption = models.CharField(max_length=255, blank=True, null=True)
    
#     def __str__(self):
#         return f"Image for {self.destination.name}"

# class Attraction(models.Model):
#     """Specific points of interest within a Destination."""
#     # Renamed related_name to 'attractions' for clarity and API consistency
#     destination = models.ForeignKey(Destination, related_name='attractions', on_delete=models.CASCADE)
#     name = models.CharField(max_length=255)
#     description = models.TextField()
#     photo = models.ImageField(upload_to='attractions/', blank=True, null=True)
#     average_rating = models.DecimalField(max_digits=2, decimal_places=1, default=0.0)

#     def __str__(self):
#         return f"{self.name} ({self.destination.name})"

# # (Do NOT paste Accommodation models here, as they are in a separate file/app)
from django.db import models
from django.conf import settings 

User = settings.AUTH_USER_MODEL 

# ===============================================
#           GLOBAL DESTINATIONS (Admin Managed)
# ===============================================

class Destination(models.Model):
    CATEGORY_CHOICES = [
        ('Cultural', 'Cultural'),
        ('Historical', 'Historical'),
        ('Adventure', 'Adventure'),
        ('Nature', 'Nature'),
    ]

    name = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    location = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    
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

# ===============================================
#           TOUR PACKAGES (Guide Managed)
# ===============================================

class TourPackage(models.Model):
    guide = models.ForeignKey(User, related_name='tours', on_delete=models.CASCADE)
    main_destination = models.ForeignKey(Destination, related_name='tour_packages', on_delete=models.SET_NULL, null=True, blank=True)
    
    name = models.CharField(max_length=255)
    description = models.TextField()
    
    # Logistics
    duration = models.CharField(max_length=100)
    max_group_size = models.PositiveIntegerField()
    what_to_bring = models.TextField(blank=True, null=True)
    
    # Pricing
    price_per_day = models.DecimalField(max_digits=10, decimal_places=2)
    solo_price = models.DecimalField(max_digits=10, decimal_places=2)
    additional_fee_per_head = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
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