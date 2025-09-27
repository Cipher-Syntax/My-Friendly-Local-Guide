from rest_framework import viewsets, permissions #type: ignore
from .models import Payment
from .serializers import PaymentSerializer
from decimal import Decimal
from rest_framework.exceptions import ValidationError #type: ignore

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-timestamp')
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        # payer = request.user
        data = serializer.validated_data
        ptype = data.get('payment_type')
        amount = data.get('amount')
        if ptype == 'Accommodation':
            # compute 2% service fee
            if amount is None:
                raise ValidationError("Amount is required for accommodation payments.")
            service_fee = (Decimal('0.02') * amount).quantize(Decimal('0.01'))
            serializer.save(payer=self.request.user, service_fee=service_fee)
        else:
            # guide registration (no service fee)
            serializer.save(payer=self.request.user)
