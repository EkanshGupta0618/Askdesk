import secrets

from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models


def generate_api_key():
    return f"ak_{secrets.token_urlsafe(32)}"


hex_color_validator = RegexValidator(r"^#[0-9a-fA-F]{6}$", "Enter a colour like #13262f.")


class Business(models.Model):
    """A tenant: one company using AskDesk. All its data is linked to this model."""

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="businesses",
    )
    api_key = models.CharField(max_length=64, unique=True, default=generate_api_key)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Chat widget settings
    widget_greeting = models.CharField(max_length=200, blank=True)  # empty = default greeting
    widget_color = models.CharField(max_length=7, default="#13262f", validators=[hex_color_validator])
    # Hosts allowed to embed the widget, e.g. ["brewhaven.com", "localhost:5174"]. Empty = any.
    allowed_domains = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name_plural = "businesses"

    def __str__(self):
        return self.name

    @property
    def greeting(self):
        return self.widget_greeting or f"Hi! Ask me anything about {self.name}."
