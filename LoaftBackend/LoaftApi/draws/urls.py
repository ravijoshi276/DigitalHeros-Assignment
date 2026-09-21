
from django.urls import path

from .views import (
    AdminDrawCreateView,
    AdminDrawDetailView,
    AdminDrawListView,
    AdminDrawStatsView,
    AdminPublishDrawView,
    AdminResetDrawView,
    AdminRunDrawView,
    CurrentDrawView,
    DrawDetailView,
    DrawListView,
    DrawMyEntryView,
)

urlpatterns = [
    # ── User-facing ───────────────────────────────────────────────────────
    path("", DrawListView.as_view(), name="draw-list"),
    path("current/", CurrentDrawView.as_view(), name="draw-current"),
    path("<int:pk>/", DrawDetailView.as_view(), name="draw-detail"),
    path("<int:pk>/my-entry/", DrawMyEntryView.as_view(), name="draw-my-entry"),

    # ── Admin: management ─────────────────────────────────────────────────
    path("admin/", AdminDrawListView.as_view(), name="admin-draw-list"),
    path("admin/stats/", AdminDrawStatsView.as_view(), name="admin-draw-stats"),
    path("admin/create/", AdminDrawCreateView.as_view(), name="admin-draw-create"),
    path("admin/<int:pk>/", AdminDrawDetailView.as_view(), name="admin-draw-detail"),

    # ── Admin: action endpoints ───────────────────────────────────────────
    path("admin/<int:pk>/run/", AdminRunDrawView.as_view(), name="admin-draw-run"),
    path("admin/<int:pk>/publish/", AdminPublishDrawView.as_view(), name="admin-draw-publish"),
    path("admin/<int:pk>/reset/", AdminResetDrawView.as_view(), name="admin-draw-reset"),
]