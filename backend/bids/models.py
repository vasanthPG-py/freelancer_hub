from django.db import models
from django.utils.translation import gettext_lazy as _

class Bid(models.Model):
    """
    Freelancer proposals submitted for open marketplace projects.
    Enforces a unique database constraint preventing multiple active bids per freelancer per project.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending Review')
        SHORTLISTED = 'SHORTLISTED', _('Shortlisted')
        ACCEPTED = 'ACCEPTED', _('Accepted / Hired')
        REJECTED = 'REJECTED', _('Rejected')
        WITHDRAWN = 'WITHDRAWN', _('Withdrawn by Freelancer')

    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='bids'
    )
    freelancer = models.ForeignKey(
        'profiles.FreelancerProfile',
        on_delete=models.CASCADE,
        related_name='bids'
    )
    bid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Total proposed bid cost in USD.")
    )
    delivery_days = models.PositiveIntegerField(
        help_text=_("Estimated turnaround time in calendar days.")
    )
    cover_letter = models.TextField(
        help_text=_("Detailed proposal outlining methodology, relevant experience, and execution plan.")
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Bid')
        verbose_name_plural = _('Bids')
        constraints = [
            # Critical constraint: Prevents duplicate active bids by the same freelancer on a single project
            models.UniqueConstraint(
                fields=['project', 'freelancer'],
                condition=models.Q(status__in=['PENDING', 'SHORTLISTED']),
                name='unique_active_bid_per_freelancer'
            )
        ]
        indexes = [
            models.Index(fields=['project', 'status']),
            models.Index(fields=['freelancer', 'status']),
        ]

    def __str__(self):
        return f"Bid by {self.freelancer.user.email} on '{self.project.title}' (${self.bid_amount})"


class BidMilestone(models.Model):
    """
    Proposed milestone breakdown submitted by a freelancer inside their proposal.
    """
    bid = models.ForeignKey(
        Bid,
        on_delete=models.CASCADE,
        related_name='milestones'
    )
    title = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_days = models.PositiveIntegerField(default=7)

    class Meta:
        ordering = ['id']
        verbose_name = _('Bid Milestone')
        verbose_name_plural = _('Bid Milestones')

    def __str__(self):
        return f"{self.title} (${self.amount})"
