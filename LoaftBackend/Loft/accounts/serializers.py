from djoser.serializers import UserCreateSerializer as BaseUserCreateSerializer
from djoser.serializers import UserSerializer as BaseUserSerializer
from rest_framework import serializers

from .models import User


class UserCreateSerializer(BaseUserCreateSerializer):
    """
    Registered via DJOSER['SERIALIZERS']['user_create'] in settings.
    Adds first_name, last_name, phone to the default Djoser signup payload.
    """

    class Meta(BaseUserCreateSerializer.Meta):
        model  = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "password",
            "re_password",   # USER_CREATE_PASSWORD_RETYPE = True in settings
        )


class UserSerializer(BaseUserSerializer):
    """
    Registered via DJOSER['SERIALIZERS']['user'] and ['current_user'].
    Powers GET /api/auth/users/me/ — adds subscription context.
    """

    has_active_subscription = serializers.BooleanField(read_only=True)
    subscription_plan       = serializers.SerializerMethodField()

    class Meta(BaseUserSerializer.Meta):
        model  = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "is_staff",
            "date_joined",
            "has_active_subscription",
            "subscription_plan",
        )
        read_only_fields = ("id", "email", "is_staff", "date_joined")

    def get_subscription_plan(self, obj):
        if hasattr(obj, "subscription"):
            return obj.subscription.plan
        return None


class AdminUserSerializer(serializers.ModelSerializer):
    """
    Full user detail for admin panel.
    Powers GET/PATCH /api/admin-stats/users/{id}/
    """

    subscription_status = serializers.SerializerMethodField()
    subscription_plan   = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "phone",
            "is_active",
            "is_staff",
            "date_joined",
            "subscription_status",
            "subscription_plan",
        )

    def get_subscription_status(self, obj):
        if hasattr(obj, "subscription"):
            return obj.subscription.status
        return "none"

    def get_subscription_plan(self, obj):
        if hasattr(obj, "subscription"):
            return obj.subscription.plan
        return None