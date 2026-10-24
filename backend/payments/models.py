"""
Payments and Simulated Transaction Models.
Designed as a payment-ready simulated test workflow with zero real money,
no stored credit cards, and clear simulated indicators.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings


class Transaction(models.Model):
    """
    Simulated ledger transaction recording milestone escrows and milestone payment releases.
    Clearly labelled as simulated test records.
    """
    class TransactionType(models.TextChoices):
        ESCROW_DEPOSIT = 'ESCROW_DEPOSIT', _('Simulated Escrow Deposit')
        MILESTONE_RELEASE = 'MILESTONE_RELEASE', _('Simulated Milestone Release')
        REFUND = 'REFUND', _('Simulated Escrow Refund')

    class Status(models.TextChoices):
        COMPLETED = 'COMPLETED', _('Completed (Simulated)')
        PENDING = 'PENDING', _('Pending (Simulated)')
        FAILED = 'FAILED', _('Failed (Simulated)')

    contract = models.ForeignKey(
        'projects.Contract',
        on_delete=models.CASCADE,
        related_name='transactions',
        help_text=_("Associated contract for this transaction.")
    )
    milestone = models.ForeignKey(
        'projects.Milestone',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions',
        help_text=_("Associated milestone for deliverable release.")
    )
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments_made',
        help_text=_("Customer initiating the simulated payment.")
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payments_received',
        help_text=_("Freelancer receiving the simulated payout.")
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Transaction amount in USD (Simulated test credits).")
    )
    transaction_type = models.CharField(
        max_length=30,
        choices=TransactionType.choices,
        default=TransactionType.MILESTONE_RELEASE
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.COMPLETED,
        db_index=True
    )
    reference_id = models.CharField(
        max_length=64,
        unique=True,
        editable=False,
        default=uuid.uuid4,
        help_text=_("Unique simulated transaction reference.")
    )
    is_simulated = models.BooleanField(
        default=True,
        help_text=_("Explicit flag confirming test simulation mode with no real money.")
    )
    note = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Simulated Transaction')
        verbose_name_plural = _('Simulated Transactions')
        indexes = [
            models.Index(fields=['contract', 'status']),
            models.Index(fields=['payer', 'created_at']),
            models.Index(fields=['recipient', 'created_at']),
        ]

    def __str__(self):
        return f"[SIMULATED] {self.transaction_type} ${self.amount} ({self.status}) - {self.reference_id[:8]}"
