from django.contrib import admin
from .models import (
	SystemAlert,
	GuideReviewRequest,
	PushDeviceToken,
	PushNotificationDeliveryLog,
)

# Register your models here.
admin.site.register(SystemAlert)
admin.site.register(GuideReviewRequest)
admin.site.register(PushDeviceToken)
admin.site.register(PushNotificationDeliveryLog)