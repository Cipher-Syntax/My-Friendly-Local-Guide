from django.contrib import admin
from .models import Payment, RefundRequest

# Register your models here.
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'payer',
        'payment_type',
        'amount',
        'status',
        'refund_status',
        'service_fee',
        'payment_method',
        'timestamp',
    )
    list_filter = ('payment_type', 'payment_method', 'status', 'refund_status', 'timestamp')
    search_fields = ('payer__username', 'gateway_transaction_id', 'gateway_payment_id')


class RefundRequestAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'payment',
        'requested_by',
        'status',
        'requested_amount',
        'approved_amount',
        'request_date',
        'process_date',
    )
    list_filter = ('status', 'request_date', 'process_date')
    search_fields = (
        'payment__id',
        'requested_by__username',
        'processed_by__username',
        'gateway_refund_id',
    )

admin.site.register(Payment, PaymentAdmin)
admin.site.register(RefundRequest, RefundRequestAdmin)