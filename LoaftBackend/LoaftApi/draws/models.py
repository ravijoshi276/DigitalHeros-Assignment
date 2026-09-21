"""
apps/draws/models.py
─────────────────────────────────────────────────────────────────────────────
Three models for the draw engine:

  Draw        — one per month, holds drawn numbers and status
  PrizeTier   — three records per draw (5/4/3 match), stores pool amounts
  DrawEntry   — one per active subscriber per draw, snapshots their scores
                at draw time (important: scores change month-to-month)

Status progression (one-way, admin-controlled):
  pending → simulated → published

Design note on JSONField:
  `drawn_numbers` and `numbers` are stored as JSON arrays of integers.
  PostgreSQL handles this natively and efficiently.
  Alternative: separate table with a FK — overkill for max 5 numbers.
"""

from django.conf import settings
from django.db import models


class Draw(models.Model):

    DRAW_TYPE_CHOICES = [
        ("random", "Random"),
        ("algorithmic", "Algorithmic (weighted by score frequency)"),
    ]

    STATUS_CHOICES = [
        ("pending", "Pending"),        # Created, not yet run
        ("simulated", "Simulated"),    # Run internally, not public
        ("published", "Published"),    # Results live
    ]

    month = models.IntegerField(help_text="1–12")
    year = models.IntegerField()
    draw_type = models.CharField(
        max_length=20, choices=DRAW_TYPE_CHOICES, default="random"
    )

    # 5 integers from 1–45, set when draw is run
    drawn_numbers = models.JSONField(
        default=list,
        help_text="5 numbers drawn from Stableford range (1–45)",
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")

    total_prize_pool = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text="Total GBP prize pool for this draw",
    )
    active_subscriber_count = models.IntegerField(
        default=0,
        help_text="Snapshot of active subscriber count at draw time",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = [("month", "year")]     # One draw per calendar month
        ordering = ["-year", "-month"]
        verbose_name = "draw"
        verbose_name_plural = "draws"

    def __str__(self):
        return f"Draw {self.month:02d}/{self.year} ({self.status})"

    @property
    def display_month(self):
        import calendar
        return f"{calendar.month_name[self.month]} {self.year}"


class PrizeTier(models.Model):
    """
    Three tiers per draw. Created when a draw is run.
    Rollover (unclaimed 5-match jackpot from previous draw) is added
    to the 5-match pool of the current draw.
    """

    TIER_CHOICES = [
        ("five_match", "5 Match (Jackpot)"),
        ("four_match", "4 Match"),
        ("three_match", "3 Match"),
    ]

    draw = models.ForeignKey(Draw, on_delete=models.CASCADE, related_name="prize_tiers")
    tier = models.CharField(max_length=20, choices=TIER_CHOICES)

    # Base pool = % of total_prize_pool per settings.PRIZE_TIER_PERCENTAGES
    pool_amount = models.DecimalField(max_digits=10, decimal_places=2)
    # Extra amount carried forward from a previous unclaimed jackpot
    rollover_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    winner_count = models.IntegerField(default=0)
    # Amount each winner receives: (pool_amount + rollover_amount) / winner_count
    amount_per_winner = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = [("draw", "tier")]

    def __str__(self):
        return f"{self.draw} — {self.get_tier_display()}"

    @property
    def total_pool(self):
        return self.pool_amount + self.rollover_amount


class DrawEntry(models.Model):
    """
    Snapshot of a user's participation in a specific draw.
    `numbers` is a list of the user's Stableford scores at the time of the draw.
    This is a snapshot — we never recalculate from live scores after a draw runs.
    """

    draw = models.ForeignKey(Draw, on_delete=models.CASCADE, related_name="entries")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="draw_entries",
    )

    # Snapshot of user's scores at draw time (up to 5 integers)
    numbers = models.JSONField(help_text="User's score snapshot at draw time")

    # How many of the user's numbers matched the drawn_numbers
    matches = models.IntegerField(default=0)
    is_winner = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("draw", "user")]       # One entry per user per draw
        verbose_name = "draw entry"
        verbose_name_plural = "draw entries"

    def __str__(self):
        return f"{self.user.email} in {self.draw} — {self.matches} matches"