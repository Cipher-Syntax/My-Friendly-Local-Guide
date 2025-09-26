from django.contrib import admin
from .models import Accommodation, Booking

# Register your models here.
class AccommodationAdmin(admin.ModelAdmin):
    list_display = ('title', 'host', 'location', 'price', 'is_approved')
    list_filter = ('is_approved', 'location')
    search_fields = ('title', 'host__username')
    actions = ['approve_accommodations']

    def approve_accommodations(self, request, queryset):
        queryset.update(is_approved=True)
    approve_accommodations.short_description = "Approve selected accommodations"

admin.site.register(Accommodation, AccommodationAdmin)

class BookingAdmin(admin.ModelAdmin):
    list_display = ('tourist', 'accommodation', 'check_in', 'check_out', 'status', 'created_at')
    list_filter = ('status', 'check_in', 'check_out')
    search_fields = ('tourist__username', 'accommodation__title')

admin.site.register(Booking, BookingAdmin)