from django.contrib import admin
from .models import SystemAlert, GuideReviewRequest

# Register your models here.
admin.site.register(SystemAlert)
admin.site.register(GuideReviewRequest)