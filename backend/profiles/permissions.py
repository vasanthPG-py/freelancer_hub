from rest_framework import permissions
from accounts.models import User

class IsFreelancerOwner(permissions.BasePermission):
    """
    Grants access only to the authenticated freelancer who owns the resource.
    """
    message = "You must be logged in as the owning freelancer to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.FREELANCER
        )

    def has_object_permission(self, request, view, obj):
        # Support FreelancerProfile, Resume, or Portfolio objects
        owner_user = getattr(obj, 'user', None)
        if not owner_user and hasattr(obj, 'freelancer'):
            owner_user = obj.freelancer.user
        return bool(owner_user == request.user or request.user.is_staff)


class IsCustomerOwner(permissions.BasePermission):
    """
    Grants access only to the authenticated customer who owns the resource.
    """
    message = "You must be logged in as the owning customer to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.CUSTOMER
        )

    def has_object_permission(self, request, view, obj):
        owner_user = getattr(obj, 'user', None)
        return bool(owner_user == request.user or request.user.is_staff)
