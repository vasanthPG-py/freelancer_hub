from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _
from .validators import validate_resume_file, validate_portfolio_image

class Category(models.Model):
    """Broad technical and domain categories for projects and skills."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=50, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Category')
        verbose_name_plural = _('Categories')
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Skill(models.Model):
    """Specific technical competencies and tools."""
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='skills'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Skill')
        verbose_name_plural = _('Skills')
        ordering = ['name']

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class FreelancerProfile(models.Model):
    """
    Detailed profile information for users with the FREELANCER role.
    Links portfolio items, verified skills, and resume data.
    """
    class ExperienceLevel(models.TextChoices):
        ENTRY = 'ENTRY', _('Entry Level (0-2 years)')
        INTERMEDIATE = 'INTERMEDIATE', _('Intermediate (3-5 years)')
        EXPERT = 'EXPERT', _('Expert (6+ years)')

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='freelancer_profile'
    )
    title = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text=_("e.g. Senior Full-Stack Engineer & System Architect")
    )
    bio = models.TextField(
        blank=True,
        default='',
        help_text=_("Comprehensive summary of your engineering experience and specialization.")
    )
    experience_level = models.CharField(
        max_length=20,
        choices=ExperienceLevel.choices,
        default=ExperienceLevel.INTERMEDIATE
    )
    hourly_rate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=50.00,
        help_text=_("Standard hourly rate in USD.")
    )
    location = models.CharField(max_length=100, blank=True, default='')
    resume_text = models.TextField(
        blank=True,
        default='',
        help_text=_("Extracted plain-text resume content utilized for AI assessment generation.")
    )
    skills = models.ManyToManyField(
        Skill,
        related_name='freelancers',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Freelancer Profile')
        verbose_name_plural = _('Freelancer Profiles')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.title or 'Freelancer'}"


class CustomerProfile(models.Model):
    """
    Profile information for project posters and clients.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='customer_profile'
    )
    company_name = models.CharField(
        max_length=150,
        blank=True,
        default='',
        help_text=_("Business or organization name.")
    )
    company_bio = models.TextField(
        blank=True,
        default='',
        help_text=_("Overview of your organization and project vision.")
    )
    website = models.URLField(blank=True, default='')
    location = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Customer Profile')
        verbose_name_plural = _('Customer Profiles')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.company_name or 'Customer'}"


class Resume(models.Model):
    """
    Uploaded resume document metadata and storage.
    """
    freelancer = models.OneToOneField(
        FreelancerProfile,
        on_delete=models.CASCADE,
        related_name='resume'
    )
    file = models.FileField(
        upload_to='resumes/%Y/%m/',
        validators=[validate_resume_file]
    )
    original_name = models.CharField(max_length=255)
    file_size = models.BigIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Resume')
        verbose_name_plural = _('Resumes')
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"Resume for {self.freelancer.user.email} ({self.original_name})"


class Portfolio(models.Model):
    """
    Showcase projects highlighting freelancer engineering capabilities.
    """
    freelancer = models.ForeignKey(
        FreelancerProfile,
        on_delete=models.CASCADE,
        related_name='portfolio_items'
    )
    title = models.CharField(max_length=150)
    description = models.TextField()
    project_url = models.URLField(blank=True, default='')
    image = models.ImageField(
        upload_to='portfolios/%Y/%m/',
        blank=True,
        null=True,
        validators=[validate_portfolio_image]
    )
    skills = models.ManyToManyField(
        Skill,
        related_name='portfolio_items',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('Portfolio Item')
        verbose_name_plural = _('Portfolio Items')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.freelancer.user.email})"
