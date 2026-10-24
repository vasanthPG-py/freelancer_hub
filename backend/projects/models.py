from django.db import models
from django.utils.translation import gettext_lazy as _

class Project(models.Model):
    """
    Project listings created by customer accounts and open for marketplace bidding.
    """
    class Status(models.TextChoices):
        DRAFT = 'DRAFT', _('Draft')
        OPEN = 'OPEN', _('Open for Bidding')
        PAUSED = 'PAUSED', _('Paused')
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress / Hired')
        COMPLETED = 'COMPLETED', _('Completed')
        CLOSED = 'CLOSED', _('Closed')

    class ExperienceLevel(models.TextChoices):
        ENTRY = 'ENTRY', _('Entry Level (0-2 yrs)')
        INTERMEDIATE = 'INTERMEDIATE', _('Intermediate (3-5 yrs)')
        EXPERT = 'EXPERT', _('Expert (6+ yrs)')

    customer = models.ForeignKey(
        'profiles.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='projects'
    )
    title = models.CharField(max_length=200)
    description = models.TextField()
    category = models.ForeignKey(
        'profiles.Category',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='projects'
    )
    budget = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Total project budget in USD.")
    )
    experience_level = models.CharField(
        max_length=20,
        choices=ExperienceLevel.choices,
        default=ExperienceLevel.INTERMEDIATE
    )
    deadline = models.DateField(help_text=_("Expected project completion date."))
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN,
        db_index=True
    )
    skills = models.ManyToManyField(
        'profiles.Skill',
        related_name='projects',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Project')
        verbose_name_plural = _('Projects')
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['budget', 'status']),
        ]

    def __str__(self):
        return f"{self.title} (${self.budget}) - {self.get_status_display()}"

    @property
    def bids_count(self):
        return self.bids.count()

    @property
    def is_open(self):
        return self.status == self.Status.OPEN


class Contract(models.Model):
    """
    Formalized agreement formed when a customer hires a freelancer for an accepted bid.
    """
    class Status(models.TextChoices):
        ACTIVE = 'ACTIVE', _('Active / In Progress')
        COMPLETED = 'COMPLETED', _('Completed')
        CANCELLED = 'CANCELLED', _('Cancelled')

    project = models.OneToOneField(
        Project,
        on_delete=models.CASCADE,
        related_name='contract'
    )
    customer = models.ForeignKey(
        'profiles.CustomerProfile',
        on_delete=models.CASCADE,
        related_name='contracts'
    )
    freelancer = models.ForeignKey(
        'profiles.FreelancerProfile',
        on_delete=models.CASCADE,
        related_name='contracts'
    )
    accepted_bid = models.ForeignKey(
        'bids.Bid',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='contracts'
    )
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Contract')
        verbose_name_plural = _('Contracts')

    def __str__(self):
        return f"Contract: {self.project.title} (${self.total_amount})"


class Milestone(models.Model):
    """
    Deliverable milestones associated with a contract.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending Funding')
        FUNDED = 'FUNDED', _('Funded in Escrow')
        SUBMITTED = 'SUBMITTED', _('Work Submitted for Review')
        APPROVED = 'APPROVED', _('Approved & Released')

    contract = models.ForeignKey(
        Contract,
        on_delete=models.CASCADE,
        related_name='milestones'
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']
        verbose_name = _('Milestone')
        verbose_name_plural = _('Milestones')

    def __str__(self):
        return f"{self.title} (${self.amount}) - {self.get_status_display()}"
