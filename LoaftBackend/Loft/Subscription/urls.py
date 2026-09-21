
from django.urls import path

from .views import (
    AdminSubscriptionListView,
    CharityUpdateView,
    CreateCheckoutSessionView,
    CustomerPortalView,
    StripeWebhookView,
    SubscriptionStatusView,
)

urlpatterns = [
    path("create-checkout/", CreateCheckoutSessionView.as_view(), name="create-checkout"),
    path("webhook/", StripeWebhookView.as_view(), name="stripe-webhook"),
    path("portal/", CustomerPortalView.as_view(), name="customer-portal"),
    path("status/", SubscriptionStatusView.as_view(), name="subscription-status"),
    path("charity/", CharityUpdateView.as_view(), name="charity-update"),
    path("admin/", AdminSubscriptionListView.as_view(), name="admin-subscription-list"),
]