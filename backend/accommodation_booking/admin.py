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
    # Columns to show in the list view
    list_display = (
        'id', 
        'tourist_name', 
        'guide_name', 
        'guide_phone',          # Show Guide's Number for GCash transfer
        'total_price', 
        'down_payment',         # Amount User Paid
        'platform_fee',         # 2% App Commission
        'guide_payout_amount',  # Net amount to send to Guide
        'is_payout_settled',    # Checkbox
        'status', 
        'created_at'
    )
    
    list_filter = ('status', 'is_payout_settled', 'check_in', 'created_at')
    search_fields = ('tourist__username', 'guide__username', 'agency__username', 'id')
    actions = ['mark_payout_as_sent']

    # --- Helper Methods for Display ---
    def tourist_name(self, obj):
        return f"{obj.tourist.first_name} {obj.tourist.last_name}"

    def guide_name(self, obj):
        if obj.guide: return f"Guide: {obj.guide.username}"
        if obj.agency: return f"Agency: {obj.agency.username}"
        if obj.accommodation: return f"Host: {obj.accommodation.host.username}"
        return "N/A"
    guide_name.short_description = "Provider"

    def guide_phone(self, obj):
        provider = obj.guide or obj.agency or (obj.accommodation.host if obj.accommodation else None)
        return provider.phone_number if provider else "N/A"
    guide_phone.short_description = "GCash / Phone"

    # --- Admin Action to Mark Payouts ---
    @admin.action(description='Mark selected payouts as SENT to Guide')
    def mark_payout_as_sent(self, request, queryset):
        rows_updated = queryset.update(is_payout_settled=True)
        self.message_user(request, f"{rows_updated} booking payouts marked as settled.")

admin.site.register(Booking, BookingAdmin)