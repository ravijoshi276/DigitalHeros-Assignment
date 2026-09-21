
from django.conf import settings
from rest_framework import serializers

from .models import GolfScore


class GolfScoreSerializer(serializers.ModelSerializer):
    """
    Used for both create and update.
    user is injected from request context, never from request body.
    """

    class Meta:
        model = GolfScore
        fields = ("id", "score", "date", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_score(self, value):
        if not (settings.STABLEFORD_MIN <= value <= settings.STABLEFORD_MAX):
            raise serializers.ValidationError(
                f"Score must be between {settings.STABLEFORD_MIN} "
                f"and {settings.STABLEFORD_MAX} (Stableford format)."
            )
        return value

    def validate(self, data):
        """
        Check for duplicate date on CREATE only.
        On PATCH the date field may not be in the payload at all.
        On PATCH where date IS in payload, we exclude the current instance.
        """
        request = self.context.get("request")
        user = request.user if request else None
        date = data.get("date")

        if date and user:
            qs = GolfScore.objects.filter(user=user, date=date)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {"date": "You have already entered a score for this date."}
                )
        return data

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ScoreListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing scores (no timestamps)."""

    class Meta:
        model = GolfScore
        fields = ("id", "score", "date")