from django.contrib import admin
from .models import Payment

# Register your models here.
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payer', 'payment_type', 'amount', 'service_fee', 'payment_method', 'timestamp')
    list_filter = ('payment_type', 'payment_method', 'timestamp')
    search_fields = ('payer__username', 'gcash_transaction_id')

admin.site.register(Payment, PaymentAdmin)