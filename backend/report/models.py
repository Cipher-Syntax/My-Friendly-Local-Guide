from django.db import models
from user_authentication.models import User

class Report(models.Model):
    reporter = models.ForeignKey(User, on_delete=models.CASCADE)
    
    reported_user = models.ForeignKey(User, related_name='reports_received', on_delete=models.CASCADE)
    
    reason = models.TextField()
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp'] 
        verbose_name = "User Report"

    def __str__(self):
        return f"Report on {self.reported_user.username} by {self.reporter.username}"