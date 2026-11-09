from django.contrib import admin

from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    can_delete = False
    fields = ["role", "content", "answered", "latency_ms", "created_at"]
    readonly_fields = fields


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "business", "message_count", "updated_at"]
    list_filter = ["business"]
    inlines = [MessageInline]

    @admin.display(description="Messages")
    def message_count(self, obj):
        return obj.messages.count()