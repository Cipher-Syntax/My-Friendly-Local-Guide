from django.db import models
from user_authentication.models import User
from destinations_and_attractions.models import Destination

# Create your models here.
class Review(models.Model):
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE)
    reviewed_user = models.ForeignKey(User, related_name='reviews_received', on_delete=models.CASCADE)
    rating = models.IntegerField()
    comment = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

class DestinationReview(models.Model):
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE)
    destination = models.ForeignKey(Destination, related_name='reviews', on_delete=models.CASCADE)
    rating = models.IntegerField()
    comment = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
