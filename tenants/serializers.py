import re
from urllib.parse import urlsplit

from rest_framework import serializers

from .models import Business

HOST_PATTERN = re.compile(r"^[a-z0-9.-]+(:\d{1,5})?$")


def normalize_domain(value):
    """'https://BrewHaven.com/shop/' -> 'brewhaven.com'; keeps a port if given."""
    value = value.strip().lower()
    if "://" not in value:
        value = f"//{value}"
    return urlsplit(value).netloc


class BusinessSettingsSerializer(serializers.ModelSerializer):
    allowed_domains = serializers.ListField(
        child=serializers.CharField(max_length=255), required=False, max_length=50
    )

    class Meta:
        model = Business
        fields = ["name", "widget_greeting", "widget_color", "allowed_domains"]

    def validate_allowed_domains(self, value):
        domains = []
        for raw in value:
            domain = normalize_domain(raw)
            if not domain or not HOST_PATTERN.match(domain):
                raise serializers.ValidationError(f"'{raw}' is not a valid domain.")
            if domain not in domains:
                domains.append(domain)
        return domains


class WidgetConfigSerializer(serializers.Serializer):
    business_name = serializers.CharField()
    greeting = serializers.CharField()
    color = serializers.CharField()
