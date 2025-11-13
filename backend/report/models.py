from django.db import models
from user_authentication.models import User

class Report(models.Model):
    """Allows users to submit reports against other users."""
    
    # The current user submitting the report
    reporter = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # The user who is being reported
    reported_user = models.ForeignKey(User, related_name='reports_received', on_delete=models.CASCADE)
    
    # The reason provided by the reporter (from frontend's reason/customReason)
    reason = models.TextField()
    
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp'] # New reports first
        verbose_name = "User Report"

    def __str__(self):
        return f"Report on {self.reported_user.username} by {self.reporter.username}"