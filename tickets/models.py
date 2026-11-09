from django.db import models


class Ticket(models.Model):
    """A question the assistant couldn't answer, handed to the business's support team."""

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        RESOLVED = "resolved", "Resolved"

    business = models.ForeignKey(
        "tenants.Business",
        on_delete=models.CASCADE,
        related_name="tickets",
    )
    conversation = models.ForeignKey(
        "chat.Conversation",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tickets",
    )
    customer_name = models.CharField(max_length=120, blank=True)
    customer_email = models.EmailField()
    question = models.TextField()
    details = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["business", "status", "-created_at"])]

    def __str__(self):
        return f"#{self.pk} {self.customer_email}: {self.question[:40]}"