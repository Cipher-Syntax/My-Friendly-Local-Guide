from django.db import models
from user_authentication.models import User
# Assuming your destination app is named 'destination'
from destinations_and_attractions.models import Destination

class Review(models.Model):
    """Represents a review and rating given to another User (typically a Guide)."""
    
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews_given')
    
    # The user being reviewed (must be an approved guide if business logic is enforced)
    reviewed_user = models.ForeignKey(User, related_name='reviews_received', on_delete=models.CASCADE)
    
    # Rating field: Restricted to 1-5
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)]) 
    comment = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        # Prevent one user from reviewing another user multiple times (optional, but common)
        unique_together = ('reviewer', 'reviewed_user') 
        verbose_name = "User Review"

    def __str__(self):
        return f"Rating {self.rating} by {self.reviewer.username} for {self.reviewed_user.username}"


class DestinationReview(models.Model):
    """Represents a review and rating given to a specific Destination."""
    
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='destination_reviews_given')
    destination = models.ForeignKey(Destination, related_name='reviews', on_delete=models.CASCADE)
    
    # Rating field: Restricted to 1-5
    rating = models.IntegerField(choices=[(i, str(i)) for i in range(1, 6)])
    comment = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        # Prevent one user from reviewing one destination multiple times
        unique_together = ('reviewer', 'destination')
        verbose_name = "Destination Review"

    def __str__(self):
        return f"Rating {self.rating} for {self.destination.name} by {self.reviewer.username}"