
from django.urls import path

from .views import AdminScoreDetailView, AdminScoreListView, ScoreDetailView, ScoreListCreateView

urlpatterns = [
    path("", ScoreListCreateView.as_view(), name="score-list-create"),
    path("<int:pk>/", ScoreDetailView.as_view(), name="score-detail"),

    # Admin score management
    path("admin/", AdminScoreListView.as_view(), name="admin-score-list"),
    path("admin/<int:pk>/", AdminScoreDetailView.as_view(), name="admin-score-detail"),
]