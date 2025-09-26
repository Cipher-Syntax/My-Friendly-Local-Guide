from django.contrib import admin
from .models import Review, DestinationReview

# Register your models here.
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('reviewer', 'reviewed_user', 'rating', 'timestamp')
    list_filter = ('rating', 'timestamp')
    search_fields = ('reviewer__username', 'reviewed_user__username')

admin.site.register(Review, ReviewAdmin)

class DestinationReviewAdmin(admin.ModelAdmin):
    list_display = ('reviewer', 'destination', 'rating', 'timestamp')
    list_filter = ('rating', 'destination')
    search_fields = ('reviewer__username', 'destination__name')

admin.site.register(DestinationReview, DestinationReviewAdmin)