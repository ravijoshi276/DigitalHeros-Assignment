"""
Stripe integration views.

CRITICAL: The webhook view is intentionally CSRF-exempt because Stripe
cannot send a CSRF token. Security comes from verifying the Stripe-Signature
header against STRIPE_WEBHOOK_SECRET (stripe.Webhook.construct_event).

Webhook is the single source of truth for subscription status updates.
Never update subscription status from the checkout success redirect —
that's a client-side event that can be spoofed.
"""

import stripe
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, status
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subscription
from .serializers import (
    AdminSubscriptionSerializer,
    CharityUpdateSerializer,
    CheckoutSessionSerializer,
    SubscriptionStatusSerializer,
)

stripe.api_key = settings.STRIPE_SECRET_KEY

# Map Stripe price IDs → our plan names
PRICE_TO_PLAN = {
    settings.STRIPE_MONTHLY_PRICE_ID: "monthly",
    settings.STRIPE_YEARLY_PRICE_ID: "yearly",
}


class CreateCheckoutSessionView(APIView):
    """
    POST /api/subscriptions/create-checkout/
    Body: { "plan": "monthly" | "yearly" }

    Returns: { "checkout_url": "https://checkout.stripe.com/..." }
    Frontend redirects the user to this URL.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = serializer.validated_data["plan"]
        price_id = (
            settings.STRIPE_MONTHLY_PRICE_ID
            if plan == "monthly"
            else settings.STRIPE_YEARLY_PRICE_ID
        )
        user = request.user

        # Retrieve or create Stripe customer
        customer_id = self._get_or_create_stripe_customer(user)

        try:
            checkout_session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[{"price": price_id, "quantity": 1}],
                mode="subscription",
                success_url=f"{settings.FRONTEND_URL}/dashboard?checkout=success",
                cancel_url=f"{settings.FRONTEND_URL}/pricing?checkout=cancelled",
                metadata={"user_id": str(user.id), "plan": plan},
            )
        except stripe.error.StripeError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({"checkout_url": checkout_session.url})

    def _get_or_create_stripe_customer(self, user) -> str:
        """
        Reuse existing Stripe customer if we already created one for this user.
        Avoids duplicate customers in Stripe dashboard.
        """
        sub = getattr(user, "subscription", None)
        if sub and sub.stripe_customer_id:
            return sub.stripe_customer_id

        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name,
            metadata={"user_id": str(user.id)},
        )

        # Pre-create or update subscription record to store customer ID
        Subscription.objects.update_or_create(
            user=user,
            defaults={
                "stripe_customer_id": customer.id,
                "status": "incomplete",
                "plan": "monthly",  # placeholder until webhook confirms
            },
        )
        return customer.id


class StripeWebhookView(APIView):
    """
    POST /api/subscriptions/webhook/
    Receives events from Stripe. Verifies signature, then dispatches
    to the appropriate handler. Always returns 200 quickly — Stripe
    retries on any non-200 response.

    CSRF exempt: Stripe cannot send CSRF tokens.
    """

    authentication_classes = []   # No JWT auth — Stripe doesn't have a JWT
    permission_classes = []       # Security via Stripe-Signature header

    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def post(self, request):
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError:
            return HttpResponse(status=400)
        except Exception:
            return HttpResponse(status=400)

        event_type = event["type"]
        data_object = event["data"]["object"]

        dispatch_map = {
            "customer.subscription.created": self._handle_subscription_created,
            "customer.subscription.updated": self._handle_subscription_updated,
            "customer.subscription.deleted": self._handle_subscription_deleted,
            "invoice.payment_failed": self._handle_payment_failed,
            "invoice.payment_succeeded": self._handle_payment_succeeded,
        }

        handler = dispatch_map.get(event_type)
        if handler:
            handler(data_object)

        return HttpResponse(status=200)

    # ── Event Handlers ─────────────────────────────────────────────────────

    def _handle_subscription_created(self, stripe_sub):
        """
        Stripe fires this after the user completes checkout.
        We upsert our Subscription record with the real subscription ID.
        """
        self._upsert_subscription(stripe_sub, status="active")

    def _handle_subscription_updated(self, stripe_sub):
        """
        Fires on renewals, plan changes, and cancellation schedules.
        We sync status and billing period from Stripe.
        """
        stripe_status = stripe_sub["status"]
        # Map Stripe statuses to our statuses
        status_map = {
            "active": "active",
            "past_due": "past_due",
            "canceled": "cancelled",
            "incomplete": "incomplete",
            "unpaid": "past_due",
        }
        our_status = status_map.get(stripe_status, "inactive")
        self._upsert_subscription(stripe_sub, status=our_status)

    def _handle_subscription_deleted(self, stripe_sub):
        """Stripe fires this when a subscription is fully cancelled and expired."""
        self._upsert_subscription(stripe_sub, status="cancelled")

    def _handle_payment_failed(self, invoice):
        """Mark subscription as past_due when payment fails."""
        stripe_sub_id = invoice.get("subscription")
        if stripe_sub_id:
            Subscription.objects.filter(
                stripe_subscription_id=stripe_sub_id
            ).update(status="past_due", updated_at=timezone.now())

    def _handle_payment_succeeded(self, invoice):
        """Ensure status is active after successful payment (handles past_due recovery)."""
        stripe_sub_id = invoice.get("subscription")
        if stripe_sub_id:
            Subscription.objects.filter(
                stripe_subscription_id=stripe_sub_id
            ).update(status="active", updated_at=timezone.now())

    def _upsert_subscription(self, stripe_sub: dict, status: str):
        """
        Core upsert: find subscription by customer ID, update its fields.
        Using customer ID (not subscription ID) as the lookup key because
        the subscription record may be pre-created with customer ID before
        the subscription ID is known.
        """
        customer_id = stripe_sub["customer"]
        subscription_id = stripe_sub["id"]

        # Determine plan from price ID
        items = stripe_sub.get("items", {}).get("data", [])
        price_id = items[0]["price"]["id"] if items else ""
        plan = PRICE_TO_PLAN.get(price_id, "monthly")

        # Convert Unix timestamps to datetime
        from datetime import datetime
        period_start = datetime.fromtimestamp(
            stripe_sub["current_period_start"], tz=timezone.utc
        )
        period_end = datetime.fromtimestamp(
            stripe_sub["current_period_end"], tz=timezone.utc
        )

        Subscription.objects.filter(
            stripe_customer_id=customer_id
        ).update(
            stripe_subscription_id=subscription_id,
            status=status,
            plan=plan,
            current_period_start=period_start,
            current_period_end=period_end,
            updated_at=timezone.now(),
        )


class SubscriptionStatusView(generics.RetrieveAPIView):
    """
    GET /api/subscriptions/status/
    Returns the current user's subscription details.
    """

    serializer_class = SubscriptionStatusSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        sub, _ = Subscription.objects.get_or_create(
            user=self.request.user,
            defaults={"status": "inactive", "plan": "monthly"},
        )
        return sub


class CharityUpdateView(generics.UpdateAPIView):
    """
    PATCH /api/subscriptions/charity/
    Update charity selection and/or contribution percentage.
    Only active subscribers can update (they've already subscribed).
    """

    serializer_class = CharityUpdateSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch"]

    def get_object(self):
        return self.request.user.subscription


class CustomerPortalView(APIView):
    """
    POST /api/subscriptions/portal/
    Creates a Stripe Billing Portal session so users can manage their
    own subscription (cancel, update card, view invoices) without
    us building that UI.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        sub = getattr(user, "subscription", None)

        if not sub or not sub.stripe_customer_id:
            return Response(
                {"error": "No active subscription found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            portal_session = stripe.billing_portal.Session.create(
                customer=sub.stripe_customer_id,
                return_url=f"{settings.FRONTEND_URL}/dashboard",
            )
        except stripe.error.StripeError as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({"portal_url": portal_session.url})


class AdminSubscriptionListView(generics.ListAPIView):
    """
    GET /api/subscriptions/admin/
    Admin: list all subscriptions with Stripe details.
    """

    serializer_class = AdminSubscriptionSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ["status", "plan"]
    search_fields = ["user__email"]

    def get_queryset(self):
        return Subscription.objects.select_related("user", "charity").order_by("-created_at")