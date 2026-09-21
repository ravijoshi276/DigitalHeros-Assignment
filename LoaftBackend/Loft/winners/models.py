"""
Winner lifecycle:

  CREATED (by draw engine)
      ↓
  User uploads proof screenshot → verification_status: pending
      ↓
  Admin reviews → verification_status: approved | rejected
      ↓  (if approved)
  Admin marks paid → payment_status: paid

State is intentionally simple: no state machine library needed.
Admin notes field lets the admin record a rejection reason.

Design note on proof_image:
  Stored in MEDIA_ROOT/winner_proofs/ in development.
  In production, swap DEFAULT_FILE_STORAGE to Cloudinary or S3.
  The field is nullable — winners are created by the engine without a proof;
  they upload it separately via the upload-proof endpoint.
"""

from django.conf import settings
from django.db import models


class Winner(models.Model):

    VERIFICATION_STATUS_CHOICES = [
        ("pending", "Pending Review"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    PAYMENT_STATUS_CHOICES = [
        ("pending", "Pending Payment"),
        ("paid", "Paid"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="wins",
    )
    draw = models.ForeignKey(
        "draws.Draw",
        on_delete=models.CASCADE,
        related_name="winners",
    )
    prize_tier = models.ForeignKey(
        "draws.PrizeTier",
        on_delete=models.CASCADE,
        related_name="winners",
    )

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="GBP amount this winner is entitled to",
    )

    # Proof upload — nullable until user submits
    proof_image = models.ImageField(
        upload_to="winner_proofs/",
        null=True,
        blank=True,
        help_text="Screenshot from the golf platform confirming scores",
    )

    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS_CHOICES,
        default="pending",
    )
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default="pending",
    )

    # Admin can record a reason for rejection or notes on payout
    admin_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "winner"
        verbose_name_plural = "winners"
        ordering = ["-created_at"]
        # One winner record per user per draw (can only win once per draw)
        unique_together = [("user", "draw")]

    def __str__(self):
        return (
            f"{self.user.email} | {self.draw} | "
            f"{self.prize_tier.get_tier_display()} | £{self.amount}"
        )