"""
Read vs write serializers kept separate.
Admin sees everything. Regular users see only published draws.
"""

from rest_framework import serializers

from .models import Draw, DrawEntry, PrizeTier


class PrizeTierSerializer(serializers.ModelSerializer):
    tier_display = serializers.CharField(source="get_tier_display", read_only=True)
    total_pool = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True
    )

    class Meta:
        model = PrizeTier
        fields = (
            "tier",
            "tier_display",
            "pool_amount",
            "rollover_amount",
            "total_pool",
            "winner_count",
            "amount_per_winner",
        )


class DrawListSerializer(serializers.ModelSerializer):
    """Lightweight — used in list views (no entries, no tier detail)."""

    display_month = serializers.CharField(read_only=True)
    draw_type_display = serializers.CharField(source="get_draw_type_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Draw
        fields = (
            "id",
            "month",
            "year",
            "display_month",
            "draw_type",
            "draw_type_display",
            "status",
            "status_display",
            "total_prize_pool",
            "active_subscriber_count",
            "published_at",
        )


class DrawDetailSerializer(serializers.ModelSerializer):
    """
    Full detail — includes prize tiers and drawn numbers.
    drawn_numbers only shown when status is 'published' (or to admin).
    """

    display_month = serializers.CharField(read_only=True)
    prize_tiers = PrizeTierSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = Draw
        fields = (
            "id",
            "month",
            "year",
            "display_month",
            "draw_type",
            "status",
            "status_display",
            "drawn_numbers",
            "total_prize_pool",
            "active_subscriber_count",
            "prize_tiers",
            "published_at",
            "created_at",
        )


class DrawEntrySerializer(serializers.ModelSerializer):
    """A user's own entry in a draw — shows their numbers and match count."""

    tier_won = serializers.SerializerMethodField()

    class Meta:
        model = DrawEntry
        fields = (
            "id",
            "numbers",
            "matches",
            "is_winner",
            "tier_won",
            "created_at",
        )

    def get_tier_won(self, obj) -> str | None:
        if not obj.is_winner:
            return None
        match_to_tier = {5: "five_match", 4: "four_match", 3: "three_match"}
        return match_to_tier.get(obj.matches)


class AdminDrawCreateSerializer(serializers.ModelSerializer):
    """Admin: create a new draw (month + year + draw_type)."""

    class Meta:
        model = Draw
        fields = ("month", "year", "draw_type")

    def validate_month(self, value):
        if not 1 <= value <= 12:
            raise serializers.ValidationError("Month must be between 1 and 12.")
        return value

    def validate(self, data):
        if Draw.objects.filter(month=data["month"], year=data["year"]).exists():
            raise serializers.ValidationError(
                f"A draw for {data['month']:02d}/{data['year']} already exists."
            )
        return data


class AdminDrawUpdateSerializer(serializers.ModelSerializer):
    """Admin: update draw_type before it has been run."""

    class Meta:
        model = Draw
        fields = ("draw_type",)

    def validate(self, data):
        if self.instance and self.instance.status != "pending":
            raise serializers.ValidationError(
                "Draw type can only be changed while draw is in 'pending' state."
            )
        return data