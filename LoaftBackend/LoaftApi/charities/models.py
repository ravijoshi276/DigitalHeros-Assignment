"""
Charity directory + charity events (golf days, fundraising events).
Public read access. Admin-only write access.
"""

from django.db import models


class Charity(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    image = models.ImageField(
        upload_to="charities/",
        null=True,
        blank=True,
        help_text="Primary charity image",
    )
    website = models.URLField(blank=True)
    is_featured = models.BooleanField(
        default=False,
        help_text="Featured charities appear on the homepage spotlight",
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Inactive charities are hidden from the directory",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "charity"
        verbose_name_plural = "charities"
        ordering = ["-is_featured", "name"]

    def __str__(self):
        return self.name

    @property
    def subscriber_count(self):
        return self.subscribers.filter(status="active").count()


class CharityEvent(models.Model):
    """
    Upcoming events associated with a charity (e.g., golf days).
    Displayed on the charity detail page.
    """

    charity = models.ForeignKey(
        Charity,
        on_delete=models.CASCADE,
        related_name="events",
    )
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    event_date = models.DateField()
    location = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["event_date"]
        verbose_name = "charity event"
        verbose_name_plural = "charity events"

    def __str__(self):
        return f"{self.charity.name} — {self.title} ({self.event_date})"