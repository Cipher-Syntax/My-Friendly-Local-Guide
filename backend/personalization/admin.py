from django.contrib import admin
from .models import Personalization

# Register your models here.
class PersonalizationAdmin(admin.ModelAdmin):
    list_display = ('user', 'preferred_location', 'onboarding_completed', 'created_at')
    list_filter = ('onboarding_completed', 'preferred_location')
    search_fields = ('user__username')

admin.site.register(Personalization, PersonalizationAdmin)