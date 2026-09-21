"""
Public: list + detail (read only, no auth needed per PRD — public visitors can browse).
Admin: create, update, delete.
"""

from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdminOrReadOnly

from .models import Charity, CharityEvent
from .serializers import (
    CharityEventSerializer,
    CharitySerializer,
    CharityWriteSerializer,
)


class CharityListView(generics.ListAPIView):
    """
    GET /api/charities/
    Public: list all active charities. Supports search (?search=name) and filter.
    """

    serializer_class = CharitySerializer
    permission_classes = [AllowAny]
    search_fields = ["name", "description"]
    filterset_fields = ["is_featured"]

    def get_queryset(self):
        return Charity.objects.filter(is_active=True).prefetch_related("events", "subscribers")


class CharityFeaturedView(generics.ListAPIView):
    """
    GET /api/charities/featured/
    Public: featured charities for the homepage spotlight section.
    """

    serializer_class = CharitySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Charity.objects.filter(is_active=True, is_featured=True).prefetch_related(
            "events", "subscribers"
        )


class CharityDetailView(generics.RetrieveAPIView):
    """
    GET /api/charities/{id}/
    Public: full charity profile including upcoming events.
    """

    serializer_class = CharitySerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return Charity.objects.filter(is_active=True).prefetch_related("events", "subscribers")


# ── Admin CRUD Views ─────────────────────────────────────────────────────────

class AdminCharityCreateView(generics.CreateAPIView):
    """POST /api/charities/admin/ — Admin: create charity."""

    serializer_class = CharityWriteSerializer
    permission_classes = [IsAdminUser]


class AdminCharityDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/charities/admin/{id}/
    Admin: update or soft-delete (is_active=False) a charity.
    """

    serializer_class = CharityWriteSerializer
    permission_classes = [IsAdminUser]
    queryset = Charity.objects.all()


class AdminCharityEventCreateView(generics.CreateAPIView):
    """POST /api/charities/admin/{charity_id}/events/ — Add event to a charity."""

    serializer_class = CharityEventSerializer
    permission_classes = [IsAdminUser]

    def perform_create(self, serializer):
        charity = generics.get_object_or_404(Charity, pk=self.kwargs["charity_id"])
        serializer.save(charity=charity)


class AdminCharityEventDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/charities/admin/events/{id}/ — Manage a specific event."""

    serializer_class = CharityEventSerializer
    permission_classes = [IsAdminUser]
    queryset = CharityEvent.objects.all()