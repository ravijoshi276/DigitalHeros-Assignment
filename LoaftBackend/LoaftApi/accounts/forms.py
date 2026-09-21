from django.contrib.admin.forms import AdminAuthenticationForm
from django.core.exceptions import ValidationError

class StrictAdminAuthenticationForm(AdminAuthenticationForm):
    def confirm_login_allowed(self, user):
        # First, run Django's default checks (is_active, is_staff)
        super().confirm_login_allowed(user)
        
        # Production-grade check: Block if staff but not a superuser
        if user.is_staff and not user.is_superuser:
            raise ValidationError(
                "Your account is not authorized to access this administration panel.",
                code="invalid_login",
            )
