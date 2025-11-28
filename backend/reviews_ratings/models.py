from django.db import models
from user_authentication.models import User
from destinations_and_attractions.models import Destination
from accommodation_booking.models import Booking

class Review(models.Model):
    """Represents a review and rating given by a tourist to a guide for a specific booking."""
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='guide_reviews')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    reviewed_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_received')
    
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)]) 
    comment = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        unique_together = ('booking', 'reviewer')
        verbose_name = "Guide Review"

    def __str__(self):
        return f"Guide review for Booking ID {self.booking.id} by {self.reviewer.username}"


class DestinationReview(models.Model):
    """Represents a review and rating given to a specific Destination for a booking."""
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='destination_reviews')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='destination_reviews_given')
    destination = models.ForeignKey(Destination, on_delete=models.CASCADE, related_name='reviews')
    
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        unique_together = ('booking', 'reviewer')
        verbose_name = "Destination Review"

    def __str__(self):
        return f"Destination review for Booking ID {self.booking.id} by {self.reviewer.username}"