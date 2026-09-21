from django.contrib.auth.models import AbstractUser
from django.db import models

from .managers import UserManager


class User(AbstractUser):
    """
    Custom user model. Email is the login field, not username.
    We keep username in the DB (AbstractUser requires it) but
    set it equal to email via UserManager — it's never used for login.
    """

    email    = models.EmailField(unique=True, verbose_name="email address")
    phone    = models.CharField(max_length=20, blank=True)
    username = models.CharField(max_length=150, blank=True)  # overridden — not required

    USERNAME_FIELD  = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]  # prompted by createsuperuser

    objects = UserManager()

    class Meta:
        verbose_name        = "user"
        verbose_name_plural = "users"
        ordering            = ["-date_joined"]

    def __str__(self):
        return self.email

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip() or self.email

    @property
    def has_active_subscription(self):
        """Used by IsActiveSubscriber permission and serializers."""
        return hasattr(self, "subscription") and self.subscription.status == "active"