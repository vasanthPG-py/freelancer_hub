from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    """Custom user manager where email is the unique identifier for auth."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_('An email address is required.'))
        email = self.normalize_email(email)
        extra_fields.setdefault('username', email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', User.Role.ADMIN)

        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))

        return self.create_user(email, password, **extra_fields)


class User(AbstractUser):
    """
    Custom User Model for FreelanceHub supporting Customer and Freelancer roles.
    Email is used as the unique username field.
    """
    class Role(models.TextChoices):
        CUSTOMER = 'CUSTOMER', _('Customer')
        FREELANCER = 'FREELANCER', _('Freelancer')
        ADMIN = 'ADMIN', _('Administrator')

    username = models.CharField(max_length=150, blank=True, null=True, unique=False)
    email = models.EmailField(_('email address'), unique=True, db_index=True)
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.FREELANCER,
        db_index=True,
        help_text=_("Designates whether the user acts as a client/customer or a freelancer.")
    )
    phone_number = models.CharField(max_length=20, blank=True, default='')
    is_verified = models.BooleanField(
        default=False,
        help_text=_("Designates whether this freelancer has successfully completed AI skill verification.")
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name', 'role']

    objects = UserManager()

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        indexes = [
            models.Index(fields=['email', 'role']),
        ]

    def __str__(self):
        return f"{self.email} ({self.get_role_display()})"

    @property
    def full_name(self):
        name = f"{self.first_name} {self.last_name}".strip()
        return name if name else self.email.split('@')[0]

    @property
    def is_customer_role(self):
        return self.role == self.Role.CUSTOMER

    @property
    def is_freelancer_role(self):
        return self.role == self.Role.FREELANCER
