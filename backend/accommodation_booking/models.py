from django.db import models
from user_authentication.models import User

# Create your models here.
class Accommodation(models.Model):
    host = models.ForeignKey(User, limit_choices_to={'is_local_guide':True, 'guide_approved':True}, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    description = models.TextField()
    location = models.CharField(max_length=255)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    photo = models.ImageField(upload_to='accommodations/', blank=True, null=True)
    is_approved = models.BooleanField(default=False)

    def __str__(self):
        return f'{self.title} ({self.host.username})'

class Booking(models.Model):
    STATUS_CHOICE = [
        ('Pending', 'Pending'),
        ('Accepted', 'Accepted'),
        ('Declined', 'Declined'),
        ('Completed', 'Completed'),
    ]
    tourist = models.ForeignKey(User, limit_choices_to={'is_tourist':True}, on_delete=models.CASCADE)
    accommodation = models.ForeignKey(Accommodation, on_delete=models.CASCADE)
    check_in = models.DateField()
    check_out = models.DateField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICE, default='Pending')
    created_at = models.DateTimeField(auto_now_add=True)

