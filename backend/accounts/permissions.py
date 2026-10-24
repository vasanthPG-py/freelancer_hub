from rest_framework import permissions
from .models import User

class IsCustomer(permissions.BasePermission):
    """Permission check ensuring the requesting user has the CUSTOMER role."""
    message = "Only customer accounts are permitted to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.CUSTOMER
        )


class IsFreelancer(permissions.BasePermission):
    """Permission check ensuring the requesting user has the FREELANCER role."""
    message = "Only freelancer accounts are permitted to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.FREELANCER
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allows read access to anyone authenticated, but write access only to the owner."""

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        owner = getattr(obj, 'user', None) or getattr(obj, 'customer', None) or getattr(obj, 'freelancer', None)
        return bool(owner == request.user or request.user.is_staff)
