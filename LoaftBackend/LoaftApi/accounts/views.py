from decimal import Decimal

from django.conf import settings
from rest_framework import generics
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from draws.models import Draw
from Subscription.models import Subscription
from winners.models import Winner

from .models import User
from .serializers import AdminUserSerializer


class AdminUserListView(generics.ListAPIView):
    """GET /api/admin-stats/users/ — paginated user list with subscription status."""

    serializer_class   = AdminUserSerializer
    permission_classes = [IsAdminUser]
    search_fields      = ["email", "first_name", "last_name"]

    def get_queryset(self):
        return User.objects.select_related("subscription").order_by("-date_joined")


class AdminUserDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/admin-stats/users/{id}/ — view or edit any user."""

    serializer_class   = AdminUserSerializer
    permission_classes = [IsAdminUser]
    queryset           = User.objects.select_related("subscription")


class AdminOverviewView(APIView):
    """
    GET /api/admin-stats/overview/
    Dashboard summary: users, prize pool estimate, charity total, winner queues.
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        total_users    = User.objects.count()
        active_subs    = Subscription.objects.filter(status="active").count()
        cancelled_subs = Subscription.objects.filter(status="cancelled").count()

        monthly_prize_pool = active_subs * settings.PRIZE_POOL_CONTRIBUTION_MONTHLY

        charity_total = sum(
            (
                settings.MONTHLY_PLAN_PRICE * (sub.charity_percentage / Decimal("100"))
                for sub in Subscription.objects.filter(status="active").only("charity_percentage")
            ),
            Decimal("0"),
        )

        pending_verifications = Winner.objects.filter(verification_status="pending").count()
        pending_payouts = Winner.objects.filter(
            verification_status="approved", payment_status="pending"
        ).count()

        total_draws  = Draw.objects.filter(status="published").count()
        upcoming_draw = Draw.objects.filter(status__in=["pending", "simulated"]).first()

        return Response({
            "users": {
                "total":               total_users,
                "active_subscribers":  active_subs,
                "cancelled":           cancelled_subs,
            },
            "prize_pool": {
                "estimated_monthly": str(monthly_prize_pool),
                "currency":          "GBP",
            },
            "charity": {
                "estimated_monthly_total": str(charity_total),
                "currency":                "GBP",
            },
            "winners": {
                "pending_verifications": pending_verifications,
                "pending_payouts":       pending_payouts,
            },
            "draws": {
                "total_published": total_draws,
                "upcoming": {
                    "id":     upcoming_draw.id,
                    "month":  upcoming_draw.month,
                    "year":   upcoming_draw.year,
                    "status": upcoming_draw.status,
                } if upcoming_draw else None,
            },
        })