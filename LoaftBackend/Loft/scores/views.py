"""
Score CRUD. Gated by IsActiveSubscriber — non-subscribers get 403.
Users can only see and edit their OWN scores.
Admin can see and edit any user's scores.
"""

from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsActiveSubscriber

from .models import GolfScore
from .serializers import GolfScoreSerializer


class ScoreListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/scores/        — list current user's scores (newest first, max 5)
    POST /api/scores/        — add a new score
    """

    serializer_class = GolfScoreSerializer
    permission_classes = [IsAuthenticated, IsActiveSubscriber]

    def get_queryset(self):
        return GolfScore.objects.filter(user=self.request.user).order_by("-date")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ScoreDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/scores/{id}/   — retrieve a specific score
    PATCH  /api/scores/{id}/   — update score or date
    DELETE /api/scores/{id}/   — delete a score
    """

    serializer_class = GolfScoreSerializer
    permission_classes = [IsAuthenticated, IsActiveSubscriber]
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        # Users can only modify their own scores
        return GolfScore.objects.filter(user=self.request.user)


# ── Admin Views ─────────────────────────────────────────────────────────────

class AdminScoreListView(generics.ListAPIView):
    """
    GET /api/scores/admin/?user_id=X
    Admin: see any user's scores. Filterable by user.
    """

    serializer_class = GolfScoreSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["user"]
    search_fields = ["user__email"]

    def get_queryset(self):
        return GolfScore.objects.select_related("user").order_by("-date")


class AdminScoreDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/scores/admin/{id}/
    Admin: edit or delete any score.
    """

    serializer_class = GolfScoreSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ["get", "patch", "delete"]

    def get_queryset(self):
        return GolfScore.objects.select_related("user").all()