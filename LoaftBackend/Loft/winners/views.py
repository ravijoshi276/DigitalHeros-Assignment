"""
Winner verification flow:

  1. Win is created by the draw engine (status: pending / payment: pending)
  2. User uploads proof via PATCH /winners/{id}/upload-proof/
  3. Admin reviews: PATCH /winners/admin/{id}/verify/  { decision, notes }
  4. Admin marks paid: PATCH /winners/admin/{id}/mark-paid/

All user views are scoped to request.user — users cannot see other users' wins.
"""

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Winner
from .serializers import (
    AdminVerifySerializer,
    AdminWinnerSerializer,
    ProofUploadSerializer,
    WinnerUserSerializer,
)


# ── User Views ────────────────────────────────────────────────────────────────

class MyWinningsView(generics.ListAPIView):
    """
    GET /api/winners/mine/
    Returns all wins for the requesting user — across all draws.
    Includes verification and payment status.
    """

    serializer_class = WinnerUserSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Winner.objects.filter(user=self.request.user)
            .select_related("draw", "prize_tier")
            .order_by("-created_at")
        )


class UploadProofView(APIView):
    """
    PATCH /api/winners/{id}/upload-proof/
    Winner uploads a screenshot from their golf platform as proof of scores.
    Multipart form data (image file).

    Guard: only the winner themselves can upload proof for their own win.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def patch(self, request, pk):
        winner = generics.get_object_or_404(Winner, pk=pk)

        # Users can only upload proof for their own wins
        if winner.user != request.user:
            raise PermissionDenied("You can only upload proof for your own winnings.")

        if winner.verification_status == "approved":
            raise ValidationError(
                {"detail": "This win is already verified — proof cannot be re-uploaded."}
            )

        serializer = ProofUploadSerializer(winner, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "detail": "Proof uploaded successfully. Pending admin review.",
                "verification_status": winner.verification_status,
            }
        )


# ── Admin Views ───────────────────────────────────────────────────────────────

class AdminWinnerListView(generics.ListAPIView):
    """
    GET /api/winners/admin/
    Admin: list all winners across all draws.
    Filter by: verification_status, payment_status, draw id.
    """

    serializer_class = AdminWinnerSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["verification_status", "payment_status", "draw"]
    search_fields = ["user__email", "user__first_name", "user__last_name"]

    def get_queryset(self):
        return (
            Winner.objects.select_related("user", "draw", "prize_tier")
            .order_by("-created_at")
        )


class AdminWinnerDetailView(generics.RetrieveAPIView):
    """GET /api/winners/admin/{id}/ — Full winner detail."""

    serializer_class = AdminWinnerSerializer
    permission_classes = [IsAdminUser]
    queryset = Winner.objects.select_related("user", "draw", "prize_tier")


class AdminVerifyWinnerView(APIView):
    """
    PATCH /api/winners/admin/{id}/verify/
    Body: { "decision": "approved"|"rejected", "notes": "..." }

    Approving a winner does NOT automatically pay them — admin must separately
    call mark-paid once payment is actually processed.

    Rejecting requires notes (rejection reason). Winner can re-upload proof
    after rejection.
    """

    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        winner = generics.get_object_or_404(
            Winner.objects.select_related("user", "draw", "prize_tier"), pk=pk
        )

        if winner.verification_status == "approved":
            raise ValidationError(
                {"detail": "This winner has already been approved. Use mark-paid to process payment."}
            )

        if not winner.proof_image:
            raise ValidationError(
                {"detail": "Cannot verify: winner has not uploaded proof yet."}
            )

        serializer = AdminVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        decision = serializer.validated_data["decision"]
        notes = serializer.validated_data.get("notes", "")

        winner.verification_status = decision
        winner.admin_notes = notes
        winner.verified_at = timezone.now()
        winner.save(update_fields=["verification_status", "admin_notes", "verified_at"])

        return Response(
            {
                "detail": f"Winner {decision}.",
                "winner_id": winner.id,
                "user": winner.user.email,
                "amount": str(winner.amount),
                "verification_status": winner.verification_status,
                "payment_status": winner.payment_status,
            }
        )


class AdminMarkPaidView(APIView):
    """
    PATCH /api/winners/admin/{id}/mark-paid/
    Records that payment has been made to the winner.
    Requires verification_status == 'approved' first.
    """

    permission_classes = [IsAdminUser]

    def patch(self, request, pk):
        winner = generics.get_object_or_404(Winner, pk=pk)

        if winner.verification_status != "approved":
            raise ValidationError(
                {"detail": "Winner must be verified before marking as paid."}
            )

        if winner.payment_status == "paid":
            raise ValidationError(
                {"detail": "This winner has already been marked as paid."}
            )

        winner.payment_status = "paid"
        winner.paid_at = timezone.now()
        winner.save(update_fields=["payment_status", "paid_at"])

        return Response(
            {
                "detail": "Payout recorded successfully.",
                "winner_id": winner.id,
                "user": winner.user.email,
                "amount": str(winner.amount),
                "paid_at": winner.paid_at,
            }
        )


class AdminPendingVerificationView(generics.ListAPIView):
    """
    GET /api/winners/admin/pending-verification/
    Shortcut: winners who have uploaded proof but not yet been reviewed.
    Intended as the admin's primary verification queue.
    """

    serializer_class = AdminWinnerSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return (
            Winner.objects.filter(
                verification_status="pending",
                proof_image__isnull=False,
            )
            .exclude(proof_image="")
            .select_related("user", "draw", "prize_tier")
            .order_by("created_at")  # oldest first — FIFO review queue
        )


class AdminPendingPayoutView(generics.ListAPIView):
    """
    GET /api/winners/admin/pending-payout/
    Shortcut: verified winners waiting to be paid.
    """

    serializer_class = AdminWinnerSerializer
    permission_classes = [IsAdminUser]

    def get_queryset(self):
        return (
            Winner.objects.filter(
                verification_status="approved",
                payment_status="pending",
            )
            .select_related("user", "draw", "prize_tier")
            .order_by("verified_at")
        )