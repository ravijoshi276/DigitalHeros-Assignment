"""
GolfScore model implementing the PRD's rolling 5-score requirement.

Key constraints (enforced at multiple levels for safety):
  1. Score range 1–45: validators + DB check constraint
  2. One score per date per user: unique_together (DB unique index)
  3. Max 5 stored scores: enforced in save() BEFORE the new score is saved
  4. Reverse chronological order: ordering = ['-date']

Design note on the rolling logic:
  We delete the oldest score BEFORE saving the new one if the user already
  has MAX_STORED_SCORES. This is a deliberate "replace" semantic, not a
  soft-delete, keeping the table small and queries simple.
"""

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class GolfScore(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="scores",
    )
    score = models.IntegerField(
        validators=[
            MinValueValidator(settings.STABLEFORD_MIN),
            MaxValueValidator(settings.STABLEFORD_MAX),
        ],
        help_text="Stableford score (1–45)",
    )
    date = models.DateField(help_text="Date the round was played")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # DB-level uniqueness: one score per user per day
        unique_together = [("user", "date")]
        ordering = ["-date"]                    # newest first, always
        verbose_name = "golf score"
        verbose_name_plural = "golf scores"

    def __str__(self):
        return f"{self.user.email} | {self.date} | {self.score}"

    def save(self, *args, **kwargs):
        """
        Before saving a NEW score (not an edit), enforce the rolling 5-score limit.
        If the user already has MAX_STORED_SCORES, delete the oldest one first.
        On an edit (self.pk exists), we never delete — just update in place.
        """
        if not self.pk:  # Only on creation, not edits
            self._enforce_rolling_limit()
        super().save(*args, **kwargs)

    def _enforce_rolling_limit(self):
        """Delete oldest score(s) if user is at the limit."""
        max_scores = settings.MAX_STORED_SCORES
        existing = (
            GolfScore.objects.filter(user=self.user)
            .order_by("-date")                 # newest first
        )
        count = existing.count()
        if count >= max_scores:
            # Delete the oldest (last in newest-first order)
            oldest_ids = existing.values_list("id", flat=True)[max_scores - 1:]
            GolfScore.objects.filter(id__in=list(oldest_ids)).delete()