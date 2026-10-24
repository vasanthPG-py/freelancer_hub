"""
Reviews & Ratings Models
Post-contract reviews from both customer (reviewing freelancer) and freelancer (reviewing customer).
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils.translation import gettext_lazy as _


class Review(models.Model):
    """
    A post-contract review submitted by one party about the other.
    Includes overall rating, skill rating (for freelancers), communication rating.
    """
    class ReviewerRole(models.TextChoices):
        CUSTOMER_REVIEWING_FREELANCER = 'CUSTOMER_TO_FREELANCER', _('Customer reviewing Freelancer')
        FREELANCER_REVIEWING_CUSTOMER = 'FREELANCER_TO_CUSTOMER', _('Freelancer reviewing Customer')

    contract = models.ForeignKey(
        'projects.Contract',
        on_delete=models.CASCADE,
        related_name='reviews'
    )
    reviewer = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='reviews_given'
    )
    reviewee = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='reviews_received'
    )
    direction = models.CharField(
        max_length=30,
        choices=ReviewerRole.choices,
        db_index=True
    )
    overall_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text=_('1-5 star overall rating')
    )
    communication_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        default=5
    )
    quality_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True,
        help_text=_('Quality of work (for freelancer reviews)')
    )
    timeliness_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    comment = models.TextField(
        max_length=2000,
        help_text=_('Public review text visible on profile.')
    )
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Review')
        verbose_name_plural = _('Reviews')
        constraints = [
            models.UniqueConstraint(
                fields=['contract', 'reviewer'],
                name='unique_review_per_contract_per_reviewer'
            )
        ]

    def __str__(self):
        return f"Review by {self.reviewer.email} → {self.reviewee.email} ({self.overall_rating}★)"
