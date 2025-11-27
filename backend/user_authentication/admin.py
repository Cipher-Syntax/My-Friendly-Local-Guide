from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, GuideApplication

class UserAdmin(BaseUserAdmin):
    actions = ['approve_guides']

    def approve_guides(self, request, queryset):
        queryset.update(guide_approved=True)
        self.message_user(request, f"{queryset.count()} users have been approved as guides.")
    approve_guides.short_description = "Approve selected users as guides"

    list_display = ('username', 'email', 'is_tourist', 'is_local_guide', 'guide_approved', 'is_staff')
    list_filter = ('is_tourist', 'is_local_guide', 'guide_approved', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'first_name', 'middle_name', 'last_name')
    ordering = ('username',)

    fieldsets = (
        (None, {'fields': ('username', 'password')}),

        ('Personal Info', {
            'fields': (
                'first_name', 'middle_name', 'last_name', 'email',
                'profile_picture', 'bio', 'phone_number', 'location'
            )
        }),

        ('Roles & Permissions', {
            'fields': (
                'is_tourist', 'is_local_guide', 'guide_approved',
                'is_staff', 'is_superuser', 'groups', 'user_permissions'
            )
        }),

        ('Important dates', {'fields': ('last_login', 'date_joined')})
    )

admin.site.register(User, UserAdmin)
admin.site.register(GuideApplication)
