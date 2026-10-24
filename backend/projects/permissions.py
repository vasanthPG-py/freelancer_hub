from rest_framework import permissions
from accounts.models import User

class IsProjectCustomerOwner(permissions.BasePermission):
    """
    Ensures that only the customer who posted the project can modify it or hire a freelancer for it.
    """
    message = "Only the customer who created this project has permission to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.CUSTOMER
        )

    def has_object_permission(self, request, view, obj):
        # Support Project or Contract objects
        owner_user = getattr(obj, 'customer', None)
        if hasattr(owner_user, 'user'):
            owner_user = owner_user.user
        return bool(owner_user == request.user or request.user.is_staff)


class CanManageMilestone(permissions.BasePermission):
    """
    Milestones can be updated (submitted) by the assigned freelancer,
    or approved/released by the contract's customer.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        contract = obj.contract
        return bool(
            request.user == contract.customer.user or
            request.user == contract.freelancer.user or
            request.user.is_staff
        )
