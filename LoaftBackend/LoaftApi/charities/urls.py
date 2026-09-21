"""apps/charities/urls.py"""

from django.urls import path

from .views import (
    AdminCharityCreateView,
    AdminCharityDetailView,
    AdminCharityEventCreateView,
    AdminCharityEventDetailView,
    CharityDetailView,
    CharityFeaturedView,
    CharityListView,
)

urlpatterns = [
    # Public
    path("", CharityListView.as_view(), name="charity-list"),
    path("featured/", CharityFeaturedView.as_view(), name="charity-featured"),
    path("<int:pk>/", CharityDetailView.as_view(), name="charity-detail"),

    # Admin
    path("admin/", AdminCharityCreateView.as_view(), name="admin-charity-create"),
    path("admin/<int:pk>/", AdminCharityDetailView.as_view(), name="admin-charity-detail"),
    path("admin/<int:charity_id>/events/", AdminCharityEventCreateView.as_view(), name="admin-event-create"),
    path("admin/events/<int:pk>/", AdminCharityEventDetailView.as_view(), name="admin-event-detail"),
]