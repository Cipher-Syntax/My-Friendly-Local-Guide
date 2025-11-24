from django.contrib import admin
# Assuming your models are correctly imported from the same module or a known path
from .models import TouristGuide, Agency # Adjust this import path if necessary

# Register Agency model (example)
@admin.register(Agency)
class AgencyAdmin(admin.ModelAdmin):
    list_display = ('business_name', 'owner_name', 'email', 'is_approved', 'created_at')
    list_filter = ('is_approved',)
    search_fields = ('business_name', 'owner_name', 'email')


# Register TouristGuide model
@admin.register(TouristGuide)
class TouristGuideAdmin(admin.ModelAdmin):
    # FIX: 'guide_name' is replaced with 'full_name' which is a method on the model
    list_display = (
        'full_name',  # This links to the TouristGuide.full_name method
        'agency', 
        'specialization', 
        'is_active',
        'created_at'
    )
    
    list_filter = ('is_active', 'agency', 'specialization')
    # Update search fields to use new names
    search_fields = ('first_name', 'last_name', 'agency__business_name')
    
    fieldsets = (
        (None, {'fields': ('agency', 'first_name', 'last_name', 'contact_number', 'profile_picture', 'bio')}),
        ('Skills', {'fields': ('specialization', 'languages')}),
        ('Status', {'fields': ('is_active',)}),
    )