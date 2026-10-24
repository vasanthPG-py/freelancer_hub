from rest_framework import permissions
from accounts.models import User

class IsBidFreelancerOwner(permissions.BasePermission):
    """
    Grants access only to the freelancer who submitted the bid.
    """
    message = "You can only view or manage your own proposals."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.FREELANCER
        )

    def has_object_permission(self, request, view, obj):
        return bool(obj.freelancer.user == request.user or request.user.is_staff)


class CanReviewProjectBids(permissions.BasePermission):
    """
    Allows the customer who posted the project to review, shortlist, accept, or reject bids.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.CUSTOMER
        )

    def has_object_permission(self, request, view, obj):
        project = getattr(obj, 'project', obj)
        return bool(project.customer.user == request.user or request.user.is_staff)
