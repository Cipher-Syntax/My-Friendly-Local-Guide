from django.contrib import admin
from .models import Destination, Attraction

# Register your models here.
class DestinationAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'location', 'average_rating')
    list_filter = ('category', 'location')
    search_fields = ('name', 'location')

admin.site.register(Destination, DestinationAdmin)

class AttractionAdmin(admin.ModelAdmin):
    list_display = ('name', 'destination', 'average_rating')
    list_filter = ('destination',)
    search_fields = ('name',)

admin.site.register(Attraction, AttractionAdmin)