from rest_framework import serializers

from .models import Charity, CharityEvent


class CharityBasicSerializer(serializers.ModelSerializer):
    """Minimal charity info — used as nested in subscription serializer."""

    class Meta:
        model = Charity
        fields = ("id", "name", "image")


class CharityEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = CharityEvent
        fields = ("id", "title", "description", "event_date", "location")


class CharitySerializer(serializers.ModelSerializer):
    """Full charity detail — used in list and detail views."""

    events = CharityEventSerializer(many=True, read_only=True)
    subscriber_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Charity
        fields = (
            "id",
            "name",
            "description",
            "image",
            "website",
            "is_featured",
            "events",
            "subscriber_count",
        )
        read_only_fields = ("subscriber_count",)


class CharityWriteSerializer(serializers.ModelSerializer):
    """Admin write serializer — includes is_active control."""

    class Meta:
        model = Charity
        fields = (
            "id",
            "name",
            "description",
            "image",
            "website",
            "is_featured",
            "is_active",
        )