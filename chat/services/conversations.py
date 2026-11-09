from django.utils import timezone

from chat.models import Conversation, Message


def get_or_create_conversation(business, conversation_id=None):
    """Continue the given conversation if it belongs to this business, otherwise start a new one."""
    if conversation_id:
        conversation = Conversation.objects.filter(pk=conversation_id, business=business).first()
        if conversation:
            return conversation
    return Conversation.objects.create(business=business)


def _touch(conversation):
    Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())


def save_user_message(conversation, question):
    message = Message.objects.create(
        conversation=conversation,
        role=Message.Role.USER,
        content=question,
    )
    _touch(conversation)
    return message


def save_assistant_message(conversation, result, latency_ms):
    message = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content=result["answer"],
        answered=result["answered"],
        sources=result["sources"],
        latency_ms=latency_ms,
    )
    _touch(conversation)
    return message