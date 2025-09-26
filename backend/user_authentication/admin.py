from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

# Register your models here.
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'is_tourist', 'is_local_guide', 'guide_approved', 'is_staff')
    list_filter = ('is_tourist', 'is_local_guide', 'guide_approved', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'firstname', 'lastname')
    ordering = ('username',)
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'email', 'profile_picture', 'bio', 'phone_number', 'location')}),
        ('Roles & Permissions', {'fields': ('is_tourist', 'is_local_guide', 'guide_approved', 'is_staff', 'is_superuser', 'group', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')})
    )

admin.site.register(User, UserAdmin)