from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import FreelancerProfile, CustomerProfile

User = get_user_model()

@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    """
    Automatically creates the corresponding profile record whenever a User is created.
    """
    if created:
        if instance.role == User.Role.FREELANCER:
            FreelancerProfile.objects.get_or_create(user=instance)
        elif instance.role == User.Role.CUSTOMER:
            CustomerProfile.objects.get_or_create(user=instance)
