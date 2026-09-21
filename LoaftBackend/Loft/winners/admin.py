from django.contrib import admin

from .models import Winner


@admin.register(Winner)
class WinnerAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "draw",
        "prize_tier",
        "amount",
        "verification_status",
        "payment_status",
        "paid_at",
    )
    list_filter = ("verification_status", "payment_status")
    search_fields = ("user__email",)
    readonly_fields = ("user", "draw", "prize_tier", "amount", "created_at", "verified_at", "paid_at")

    fieldsets = (
        ("Winner Info", {"fields": ("user", "draw", "prize_tier", "amount")}),
        ("Proof", {"fields": ("proof_image",)}),
        ("Status", {"fields": ("verification_status", "payment_status", "admin_notes")}),
        ("Timestamps", {"fields": ("created_at", "verified_at", "paid_at")}),
    )

    actions = ["mark_approved", "mark_paid"]

    def mark_approved(self, request, queryset):
        from django.utils import timezone
        queryset.update(verification_status="approved", verified_at=timezone.now())
        self.message_user(request, f"{queryset.count()} winner(s) approved.")

    mark_approved.short_description = "✅ Approve selected winners"

    def mark_paid(self, request, queryset):
        from django.utils import timezone
        queryset.filter(verification_status="approved").update(
            payment_status="paid", paid_at=timezone.now()
        )
        self.message_user(request, "Selected verified winners marked as paid.")

    mark_paid.short_description = "💷 Mark selected as paid"