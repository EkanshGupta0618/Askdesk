from rest_framework import serializers

PERIOD_CHOICES = [7, 30, 90]


class OverviewQuerySerializer(serializers.Serializer):
    """Validates ?days= for the overview endpoint."""

    days = serializers.ChoiceField(
        choices=PERIOD_CHOICES,
        default=30,
        error_messages={"invalid_choice": "days must be 7, 30 or 90."},
    )


# ---------- response (used for the API docs and to shape the output) ----------

class PeriodSerializer(serializers.Serializer):
    days = serializers.IntegerField()
    start = serializers.DateTimeField()
    end = serializers.DateTimeField()


class DailySerializer(serializers.Serializer):
    date = serializers.DateField()
    questions = serializers.IntegerField()
    unanswered = serializers.IntegerField()


class TopUnansweredSerializer(serializers.Serializer):
    question = serializers.CharField()
    count = serializers.IntegerField()
    last_asked_at = serializers.DateTimeField()
    conversation_id = serializers.UUIDField(help_text="The most recent conversation where this was asked")


class DocumentHealthSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    ready = serializers.IntegerField()
    processing = serializers.IntegerField()
    failed = serializers.IntegerField()


class OverviewSerializer(serializers.Serializer):
    period = PeriodSerializer()
    questions = serializers.IntegerField()
    previous_questions = serializers.IntegerField()
    conversations = serializers.IntegerField()
    answered = serializers.IntegerField()
    unanswered = serializers.IntegerField()
    answer_rate = serializers.FloatField(allow_null=True, help_text="0–1, null when nothing was answered or missed")
    avg_latency_ms = serializers.IntegerField(allow_null=True)
    p90_latency_ms = serializers.IntegerField(allow_null=True)
    open_tickets = serializers.IntegerField(help_text="Open or in progress right now, not limited to the period")
    tickets_created = serializers.IntegerField()
    avg_resolution_hours = serializers.FloatField(allow_null=True)
    daily = DailySerializer(many=True)
    top_unanswered = TopUnansweredSerializer(many=True)
    documents = DocumentHealthSerializer()
