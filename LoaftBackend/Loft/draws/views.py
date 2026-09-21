"""
User-facing views show only PUBLISHED draws.
Admin views see all statuses and have action endpoints.

Action endpoints (admin only):
  POST /draws/{id}/run/     → calls services.run_draw()
  POST /draws/{id}/publish/ → calls services.publish_draw()
  POST /draws/{id}/reset/   → calls services.reset_draw()
"""

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Draw, DrawEntry
from .serializers import (
    AdminDrawCreateSerializer,
    AdminDrawUpdateSerializer,
    DrawDetailSerializer,
    DrawEntrySerializer,
    DrawListSerializer,
)
from . import services


# ── User-Facing Views ─────────────────────────────────────────────────────────

class DrawListView(generics.ListAPIView):
    """
    GET /api/draws/
    Authenticated users: list of all PUBLISHED draws, newest first.
    """

    serializer_class = DrawListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Draw.objects.filter(status="published").order_by("-year", "-month")


class DrawDetailView(generics.RetrieveAPIView):
    """
    GET /api/draws/{id}/
    Authenticated: full draw detail — only published draws visible to regular users.
    """

    serializer_class = DrawDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Regular users: published only. Admins: all.
        if self.request.user.is_staff:
            return Draw.objects.prefetch_related("prize_tiers").all()
        return Draw.objects.filter(status="published").prefetch_related("prize_tiers")


class CurrentDrawView(APIView):
    """
    GET /api/draws/current/
    Returns info about the current month's draw — if one exists.
    Shows limited info (no drawn_numbers) if not yet published.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        now = timezone.now()
        draw = (
            Draw.objects.filter(month=now.month, year=now.year)
            .prefetch_related("prize_tiers")
            .first()
        )

        if not draw:
            return Response(
                {
                    "exists": False,
                    "message": f"No draw scheduled for {now.strftime('%B %Y')} yet.",
                }
            )

        data = DrawListSerializer(draw).data
        data["exists"] = True

        # Only include drawn_numbers for published draws
        if draw.status == "published":
            data["drawn_numbers"] = draw.drawn_numbers
            data["prize_tiers"] = [
                {
                    "tier": t.tier,
                    "tier_display": t.get_tier_display(),
                    "total_pool": str(t.total_pool),
                    "winner_count": t.winner_count,
                    "amount_per_winner": str(t.amount_per_winner),
                }
                for t in draw.prize_tiers.all()
            ]

        return Response(data)


class DrawMyEntryView(APIView):
    """
    GET /api/draws/{id}/my-entry/
    Returns the requesting user's DrawEntry for a specific draw.
    Includes their score snapshot, match count, and whether they won.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        draw = generics.get_object_or_404(Draw, pk=pk, status="published")

        try:
            entry = DrawEntry.objects.get(draw=draw, user=request.user)
        except DrawEntry.DoesNotExist:
            return Response(
                {
                    "entered": False,
                    "reason": "You had no scores recorded at the time of this draw.",
                }
            )

        serializer = DrawEntrySerializer(entry)
        return Response({"entered": True, **serializer.data})


# ── Admin Views ───────────────────────────────────────────────────────────────

class AdminDrawListView(generics.ListAPIView):
    """
    GET /api/draws/admin/
    Admin: see ALL draws across all statuses.
    """

    serializer_class = DrawListSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["status", "year"]

    def get_queryset(self):
        return Draw.objects.prefetch_related("prize_tiers").order_by("-year", "-month")


class AdminDrawCreateView(generics.CreateAPIView):
    """
    POST /api/draws/admin/
    Admin: create a draw for a given month/year.
    """

    serializer_class = AdminDrawCreateSerializer
    permission_classes = [IsAdminUser]


class AdminDrawDetailView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/draws/admin/{id}/  → full draw detail (all statuses)
    PATCH /api/draws/admin/{id}/ → update draw_type (pending only)
    """

    permission_classes = [IsAdminUser]
    queryset = Draw.objects.prefetch_related("prize_tiers").all()
    http_method_names = ["get", "patch"]

    def get_serializer_class(self):
        if self.request.method == "PATCH":
            return AdminDrawUpdateSerializer
        return DrawDetailSerializer


class AdminRunDrawView(APIView):
    """
    POST /api/draws/admin/{id}/run/
    Executes the draw simulation. Sets status: pending → simulated.
    Returns a full summary of the simulation results.
    """

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        draw = generics.get_object_or_404(Draw, pk=pk)

        try:
            summary = services.run_draw(draw)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})

        return Response(
            {
                "status": "simulated",
                "message": (
                    f"Draw simulated successfully. "
                    f"{summary['total_entries']} entries processed. "
                    f"Review results then call /publish/ to go live."
                ),
                "summary": summary,
            }
        )


class AdminPublishDrawView(APIView):
    """
    POST /api/draws/admin/{id}/publish/
    Makes draw results public. Irreversible.
    Sets status: simulated → published.
    """

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        draw = generics.get_object_or_404(Draw, pk=pk)

        try:
            services.publish_draw(draw)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})

        return Response(
            {
                "status": "published",
                "message": f"Draw for {draw.display_month} is now live.",
                "published_at": draw.published_at,
            }
        )


class AdminResetDrawView(APIView):
    """
    POST /api/draws/admin/{id}/reset/
    Reset a simulated draw back to pending so it can be re-run
    (e.g. admin wants to switch random → algorithmic and re-simulate).
    Deletes all DrawEntry and Winner records for this draw.
    """

    permission_classes = [IsAdminUser]

    def post(self, request, pk):
        draw = generics.get_object_or_404(Draw, pk=pk)

        try:
            services.reset_draw(draw)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})

        return Response(
            {
                "status": "pending",
                "message": "Draw reset to pending. All entries and winners cleared.",
            }
        )


class AdminDrawStatsView(APIView):
    """
    GET /api/draws/admin/stats/
    Aggregate draw statistics for the admin analytics dashboard.
    """

    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Count, Sum
        from apps.winners.models import Winner

        published_draws = Draw.objects.filter(status="published")

        total_draws = published_draws.count()
        total_prize_distributed = published_draws.aggregate(
            total=Sum("total_prize_pool")
        )["total"] or 0

        # Rollover chain: latest published draw with unclaimed jackpot
        jackpot_rollover = 0
        latest = published_draws.order_by("-year", "-month").first()
        if latest:
            five_tier = latest.prize_tiers.filter(tier="five_match", winner_count=0).first()
            if five_tier:
                jackpot_rollover = five_tier.total_pool

        from django.db.models import Q

        winner_stats = Winner.objects.aggregate(
            total_winners=Count("id"),
            total_paid=Count("id", filter=Q(payment_status="paid")),
        )

        return Response(
            {
                "total_published_draws": total_draws,
                "total_prize_pool_distributed": str(total_prize_distributed),
                "current_jackpot_rollover": str(jackpot_rollover),
                "total_winners_all_time": winner_stats["total_winners"],
                "total_winners_paid": winner_stats["total_paid"],
            }
        )