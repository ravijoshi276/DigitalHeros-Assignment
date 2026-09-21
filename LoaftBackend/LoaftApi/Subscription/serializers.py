
from decimal import Decimal

from django.conf import settings
from rest_framework import serializers
from charities.serializers import CharityBasicSerializer
from django.contrib.auth import get_user_model
from .models import Subscription
from rest_framework.validators import UniqueValidator
User = get_user_model()


class SubscriptionStatusSerializer(serializers.ModelSerializer):
    """Returned by GET /subscriptions/status/ — user-facing subscription summary."""

    charity_detail = CharityBasicSerializer(source="charity", read_only=True)
    renewal_date = serializers.DateTimeField(source="current_period_end", read_only=True)

    class Meta:
        model = Subscription
        fields = (
            "id",
            "plan",
            "status",
            "renewal_date",
            "charity_detail",
            "charity_percentage",
            "created_at",
        )
        read_only_fields = fields


class CharityUpdateSerializer(serializers.ModelSerializer):
    """
    PATCH /subscriptions/charity/
    Allows users to update their chosen charity and/or contribution percentage.
    charity_percentage has a minimum of 10 (enforced at model level too).
    """

    class Meta:
        model = Subscription
        fields = ("charity", "charity_percentage")

    def validate_charity_percentage(self, value):
        if value < Decimal(str(settings.CHARITY_MIN_PERCENTAGE)):
            raise serializers.ValidationError(
                f"Charity percentage cannot be less than {settings.CHARITY_MIN_PERCENTAGE}%."
            )
        return value


class CheckoutSessionSerializer(serializers.Serializer):
    """Input: which plan the user wants to subscribe to."""

    PLAN_CHOICES = [("monthly", "Monthly"), ("yearly", "Yearly")]
    plan = serializers.ChoiceField(choices=PLAN_CHOICES)


class AdminSubscriptionSerializer(serializers.ModelSerializer):
    """Admin view: full subscription detail including Stripe IDs."""

    user_email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = Subscription
        fields = "__all__"
        read_only_fields = ("stripe_customer_id", "stripe_subscription_id")