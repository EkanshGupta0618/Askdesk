from rest_framework import serializers

from .models import Conversation, Message


# ---------- ask endpoints ----------

class AskSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=1000, trim_whitespace=True)
    # Leave empty to start a new conversation; send the returned ID to continue it
    conversation_id = serializers.UUIDField(required=False, allow_null=True)


class SourceSerializer(serializers.Serializer):
    number = serializers.IntegerField()
    document_id = serializers.IntegerField()
    document_title = serializers.CharField()
    page_number = serializers.IntegerField()
    snippet = serializers.CharField()
    distance = serializers.FloatField()


class AskResponseSerializer(serializers.Serializer):
    """What the ask endpoint returns (used for the API docs)."""

    conversation_id = serializers.UUIDField()
    answered = serializers.BooleanField()
    answer = serializers.CharField()
    sources = SourceSerializer(many=True)


# ---------- dashboard ----------

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ["id", "role", "content", "answered", "sources", "latency_ms", "created_at"]


class ConversationListSerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(read_only=True)
    unanswered_count = serializers.IntegerField(read_only=True)
    first_question = serializers.CharField(read_only=True, allow_null=True)

    class Meta:
        model = Conversation
        fields = [
            "id", "created_at", "updated_at",
            "question_count", "unanswered_count", "first_question",
        ]


class ConversationDetailSerializer(ConversationListSerializer):
    messages = MessageSerializer(many=True, read_only=True)

    class Meta(ConversationListSerializer.Meta):
        fields = ConversationListSerializer.Meta.fields + ["messages"]