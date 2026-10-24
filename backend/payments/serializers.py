from rest_framework import serializers
from .models import Transaction


class TransactionSerializer(serializers.ModelSerializer):
    payer_email = serializers.ReadOnlyField(source='payer.email')
    recipient_email = serializers.ReadOnlyField(source='recipient.email')
    project_title = serializers.ReadOnlyField(source='contract.project.title')
    milestone_title = serializers.ReadOnlyField(source='milestone.title')

    class Meta:
        model = Transaction
        fields = [
            'id',
            'reference_id',
            'contract',
            'milestone',
            'project_title',
            'milestone_title',
            'payer',
            'payer_email',
            'recipient',
            'recipient_email',
            'amount',
            'transaction_type',
            'status',
            'is_simulated',
            'note',
            'created_at',
        ]
        read_only_fields = ['id', 'reference_id', 'is_simulated', 'created_at']


class SimulatePaymentRequestSerializer(serializers.Serializer):
    contract_id = serializers.IntegerField(required=True)
    milestone_id = serializers.IntegerField(required=False, allow_null=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    transaction_type = serializers.ChoiceField(
        choices=Transaction.TransactionType.choices,
        default=Transaction.TransactionType.MILESTONE_RELEASE
    )
    note = serializers.CharField(max_length=255, required=False, allow_blank=True)
