from django.urls import path

from .views import AdminOverviewView, AdminUserDetailView, AdminUserListView

urlpatterns = [
    path("overview/",          AdminOverviewView.as_view(),   name="admin-overview"),
    path("users/",             AdminUserListView.as_view(),   name="admin-user-list"),
    path("users/<int:pk>/",    AdminUserDetailView.as_view(), name="admin-user-detail"),
]