from django.contrib import admin
from .models import Report

# Register your models here.
class ReportAdmin(admin.ModelAdmin):
    list_display = ('reporter', 'reported_user', 'timestamp')
    list_filter = ('timestamp',)
    search_fields = ('reporter__username', 'reported_user__username')

admin.site.register(Report, ReportAdmin)
