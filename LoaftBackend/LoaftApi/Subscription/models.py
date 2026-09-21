"""
Design decisions:
  - OneToOne with User: each user has at most one subscription at a time.
  - stripe_subscription_id is the source of truth for subscription state.
  - Webhook handler is the ONLY thing that mutates subscription status.
    This prevents race conditions between the UI and Stripe.
  - charity and charity_percentage live here so the draw engine can
    calculate contributions when running a draw.
"""

from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Subscription(models.Model):

    PLAN_CHOICES = [
        ("monthly", "Monthly"),
        ("yearly", "Yearly"),
    ]

    STATUS_CHOICES = [
        ("active", "Active"),
        ("inactive", "Inactive"),        # Before first payment or after free trial
        ("cancelled", "Cancelled"),      # User cancelled; access until period end
        ("past_due", "Past Due"),        # Payment failed; Stripe is retrying
        ("incomplete", "Incomplete"),    # Checkout started but not completed
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="subscription",
    )
    plan = models.CharField(max_length=10, choices=PLAN_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="incomplete")

    # Stripe IDs — never null once checkout completes
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True, unique=True, null=True)

    # Billing period (sourced from Stripe webhook)
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)

    # Charity allocation
    charity = models.ForeignKey(
        "charities.Charity",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="subscribers",
    )
    charity_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("10.00"),
        validators=[
            MinValueValidator(Decimal("10.00")),    # PRD: minimum 10%
            MaxValueValidator(Decimal("100.00")),
        ],
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "subscription"
        verbose_name_plural = "subscriptions"

    def __str__(self):
        return f"{self.user.email} — {self.plan} ({self.status})"

    @property
    def is_active(self):
        return self.status == "active"

    def monthly_charity_contribution(self, monthly_price: Decimal) -> Decimal:
        """
        Calculate the GBP amount going to charity this month.
        For yearly plans we divide the yearly price by 12.
        """
        return (monthly_price * self.charity_percentage / Decimal("100")).quantize(
            Decimal("0.01")
        )