from django.contrib import admin
from django.utils.html import mark_safe 
from .models import Destination, Attraction, DestinationImage, TourPackage, TourStop

# ==============================================
# 1. DESTINATION ADMIN (Global Data)
# ==============================================

class DestinationImageInline(admin.TabularInline):
    """Allows adding multiple images directly inside the Destination page"""
    model = DestinationImage
    extra = 1
    readonly_fields = ['image_preview']

    def image_preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" width="100" />')
        return ""

class AttractionInline(admin.StackedInline):
    """Allows adding Attractions (e.g. Fort Pilar) inside the Destination page"""
    model = Attraction
    extra = 0 

class DestinationAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'location', 'average_rating')
    list_filter = ('category', 'location')
    search_fields = ('name', 'location')
    inlines = [DestinationImageInline, AttractionInline]

# ==============================================
# 2. TOUR ADMIN (Guide Data)
# ==============================================

class TourStopInline(admin.TabularInline):
    """Allows Admin to see the specific stops a guide added to their tour"""
    model = TourStop
    extra = 0
    readonly_fields = ['image_preview']

    def image_preview(self, obj):
        if obj.image:
            return mark_safe(f'<img src="{obj.image.url}" width="80" style="border-radius:5px;" />')
        return "No Image"

class TourPackageAdmin(admin.ModelAdmin):
    list_display = ('name', 'guide', 'main_destination', 'price_per_day', 'created_at')
    list_filter = ('main_destination', 'created_at')
    search_fields = ('name', 'guide__username', 'guide__first_name')
    
    # This lets you see the "Featured Places" the guide uploaded
    inlines = [TourStopInline] 

# ==============================================
# 3. REGISTRATION
# ==============================================

admin.site.register(Destination, DestinationAdmin)
admin.site.register(TourPackage, TourPackageAdmin)

# Optional: Keep these registered if you want to access them individually
admin.site.register(Attraction)
admin.site.register(DestinationImage)
admin.site.register(TourStop)