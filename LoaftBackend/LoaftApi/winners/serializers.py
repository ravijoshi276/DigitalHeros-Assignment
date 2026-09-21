from django.utils import timezone
from rest_framework import serializers

from .models import Winner


class WinnerUserSerializer(serializers.ModelSerializer):
    """
    What a winner sees about their own prize.
    Does NOT expose admin_notes or other winners' data.
    """

    tier_display = serializers.CharField(
        source="prize_tier.get_tier_display", read_only=True
    )
    draw_month = serializers.IntegerField(source="draw.month", read_only=True)
    draw_year = serializers.IntegerField(source="draw.year", read_only=True)
    draw_display = serializers.CharField(source="draw.display_month", read_only=True)
    verification_status_display = serializers.CharField(
        source="get_verification_status_display", read_only=True
    )
    payment_status_display = serializers.CharField(
        source="get_payment_status_display", read_only=True
    )

    class Meta:
        model = Winner
        fields = (
            "id",
            "draw_month",
            "draw_year",
            "draw_display",
            "tier_display",
            "amount",
            "proof_image",
            "verification_status",
            "verification_status_display",
            "payment_status",
            "payment_status_display",
            "created_at",
            "verified_at",
            "paid_at",
        )
        read_only_fields = (
            "id",
            "amount",
            "verification_status",
            "payment_status",
            "created_at",
            "verified_at",
            "paid_at",
        )


class ProofUploadSerializer(serializers.ModelSerializer):
    """
    Used by the winner to upload their proof screenshot.
    Only accepts proof_image field.
    Validates that proof has not already been approved.
    """

    class Meta:
        model = Winner
        fields = ("proof_image",)

    def validate(self, data):
        if self.instance and self.instance.verification_status == "approved":
            raise serializers.ValidationError(
                "This win has already been verified — proof cannot be re-uploaded."
            )
        if not data.get("proof_image"):
            raise serializers.ValidationError({"proof_image": "A proof screenshot is required."})
        return data


class AdminWinnerSerializer(serializers.ModelSerializer):
    """Full winner detail for admin — includes user info and admin notes."""

    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)
    tier_display = serializers.CharField(
        source="prize_tier.get_tier_display", read_only=True
    )
    draw_display = serializers.CharField(source="draw.display_month", read_only=True)

    class Meta:
        model = Winner
        fields = (
            "id",
            "user_email",
            "user_name",
            "draw_display",
            "tier_display",
            "amount",
            "proof_image",
            "verification_status",
            "payment_status",
            "admin_notes",
            "created_at",
            "verified_at",
            "paid_at",
        )
        read_only_fields = (
            "id",
            "user_email",
            "user_name",
            "draw_display",
            "tier_display",
            "amount",
            "created_at",
            "verified_at",
            "paid_at",
        )


class AdminVerifySerializer(serializers.Serializer):
    """
    Body for PATCH /winners/admin/{id}/verify/
    decision: 'approved' | 'rejected'
    notes: optional reason (required on rejection — validated in view)
    """

    DECISION_CHOICES = [("approved", "Approved"), ("rejected", "Rejected")]
    decision = serializers.ChoiceField(choices=DECISION_CHOICES)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        if data["decision"] == "rejected" and not data.get("notes"):
            raise serializers.ValidationError(
                {"notes": "A rejection reason is required when rejecting a proof."}
            )
        return data