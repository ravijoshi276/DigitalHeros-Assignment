from django.urls import path

from .views import (
    AdminMarkPaidView,
    AdminPendingPayoutView,
    AdminPendingVerificationView,
    AdminVerifyWinnerView,
    AdminWinnerDetailView,
    AdminWinnerListView,
    MyWinningsView,
    UploadProofView,
)

urlpatterns = [
    # ── User-facing ───────────────────────────────────────────────────────
    path("mine/", MyWinningsView.as_view(), name="my-winnings"),
    path("<int:pk>/upload-proof/", UploadProofView.as_view(), name="upload-proof"),

    # ── Admin: lists ──────────────────────────────────────────────────────
    path("admin/", AdminWinnerListView.as_view(), name="admin-winner-list"),
    path("admin/pending-verification/", AdminPendingVerificationView.as_view(), name="admin-pending-verification"),
    path("admin/pending-payout/", AdminPendingPayoutView.as_view(), name="admin-pending-payout"),
    path("admin/<int:pk>/", AdminWinnerDetailView.as_view(), name="admin-winner-detail"),

    # ── Admin: actions ────────────────────────────────────────────────────
    path("admin/<int:pk>/verify/", AdminVerifyWinnerView.as_view(), name="admin-verify-winner"),
    path("admin/<int:pk>/mark-paid/", AdminMarkPaidView.as_view(), name="admin-mark-paid"),
]