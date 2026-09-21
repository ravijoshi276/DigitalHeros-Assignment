"""
Design: IsActiveSubscriber is applied to any endpoint where the PRD says
"non-subscribers receive restricted access". Raises 403 (not 401) because
the user IS authenticated — they just don't have an active subscription.
"""

from rest_framework.permissions import BasePermission


class IsActiveSubscriber(BasePermission):
    """
    Grants access only to users with an active subscription.
    Used on: score entry, draw entry, dashboard data.
    """

    message = "An active subscription is required to access this feature."

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.has_active_subscription
        )


class IsAdminOrReadOnly(BasePermission):
    """
    GET/HEAD/OPTIONS are open to authenticated users.
    Write operations (POST/PUT/PATCH/DELETE) require is_staff.
    Used on: charity endpoints.
    """

    def has_permission(self, request, view):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            return request.user and request.user.is_authenticated
        return request.user and request.user.is_staff