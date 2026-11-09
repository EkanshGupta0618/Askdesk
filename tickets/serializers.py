from django.utils import timezone
from rest_framework import serializers

from .models import Ticket


class TicketCreateSerializer(serializers.Serializer):
    """What the widget sends when a customer asks for help."""

    email = serializers.EmailField()
    name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    question = serializers.CharField(max_length=1000)
    details = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    conversation_id = serializers.UUIDField(required=False, allow_null=True)


class TicketCreatedSerializer(serializers.Serializer):
    """What the customer gets back; deliberately minimal."""

    id = serializers.IntegerField()
    message = serializers.CharField()


class TicketSerializer(serializers.ModelSerializer):
    """Dashboard view of a ticket. Only the status can be changed."""

    class Meta:
        model = Ticket
        fields = [
            "id", "conversation", "customer_name", "customer_email", "question",
            "details", "status", "created_at", "updated_at", "resolved_at",
        ]
        read_only_fields = [f for f in fields if f != "status"]

    def update(self, instance, validated_data):
        new_status = validated_data.get("status", instance.status)
        if new_status == Ticket.Status.RESOLVED and instance.status != Ticket.Status.RESOLVED:
            validated_data["resolved_at"] = timezone.now()
        elif new_status != Ticket.Status.RESOLVED:
            validated_data["resolved_at"] = None  # reopened
        return super().update(instance, validated_data)