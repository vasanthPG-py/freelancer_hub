"""
Messaging Models
Conversation threads tied to contracts, with per-message read tracking.
"""
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _


class Conversation(models.Model):
    """
    A chat thread between a customer and freelancer, typically tied to a contract/project.
    """
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='conversations'
    )
    contract = models.OneToOneField(
        'projects.Contract',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversation'
    )
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conversations'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        verbose_name = _('Conversation')
        verbose_name_plural = _('Conversations')

    def __str__(self):
        parts = [p.email for p in self.participants.all()[:2]]
        return f"Conversation: {' ↔ '.join(parts)}"

    @property
    def last_message(self):
        return self.messages.order_by('-created_at').first()

    def unread_count_for(self, user):
        return self.messages.exclude(sender=user).filter(
            read_receipts__is_read=False,
            read_receipts__user=user
        ).count()


class Message(models.Model):
    """
    Individual chat message within a conversation thread.
    """
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    content = models.TextField()
    attachment = models.FileField(
        upload_to='message_attachments/%Y/%m/',
        blank=True,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_system_message = models.BooleanField(
        default=False,
        help_text=_('System-generated notifications within the conversation thread.')
    )

    class Meta:
        ordering = ['created_at']
        verbose_name = _('Message')
        verbose_name_plural = _('Messages')

    def __str__(self):
        return f"Message from {self.sender.email}: {self.content[:60]}"

    def mark_read_for(self, user):
        MessageReadReceipt.objects.update_or_create(
            message=self,
            user=user,
            defaults={'is_read': True}
        )


class MessageReadReceipt(models.Model):
    """Tracks whether a specific user has read a specific message."""
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='read_receipts'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('message', 'user')


class Notification(models.Model):
    """
    In-app notification for a specific user.
    Covers hiring events, messages, reviews, milestone updates, assessments, and system messages.
    """
    class NotificationType(models.TextChoices):
        HIRE = 'HIRE', _('Hired for a project')
        MESSAGE = 'MESSAGE', _('New message received')
        REVIEW = 'REVIEW', _('New review posted')
        MILESTONE = 'MILESTONE', _('Milestone status changed')
        ASSESSMENT = 'ASSESSMENT', _('Assessment result')
        BID = 'BID', _('Bid activity')
        SYSTEM = 'SYSTEM', _('System notification')

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(
        max_length=20,
        choices=NotificationType.choices,
        default=NotificationType.SYSTEM,
        db_index=True
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(
        max_length=500,
        blank=True,
        default='',
        help_text=_('Frontend route to navigate to when notification is clicked.')
    )
    is_read = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Notification')
        verbose_name_plural = _('Notifications')

    def __str__(self):
        return f"[{self.notification_type}] {self.title} → {self.user.email}"
