from django.db import models

# Create your models here.
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
    photo = models.ImageField(upload_to='destinations/', blank=True, null=True)
    average_rating = models.FloatField(default=0.0)

    def __str__(self):
        return self.name

class Attraction(models.Model):
    destination = models.ForeignKey(Destination, related_name='attraction', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField()
    photo = models.ImageField(upload_to='attractions/', blank=True, null=True)
    average_rating = models.FloatField(default=0.0)