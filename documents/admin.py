from django.contrib import admin

from .models import Chunk, Document
from .tasks import process_document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ["title", "business", "status", "chunk_count", "created_at"]
    list_filter = ["status", "business"]
    search_fields = ["title"]
    readonly_fields = ["status", "error_message"]
    actions = ["reprocess_documents"]

    @admin.display(description="Chunks")
    def chunk_count(self, obj):
        return obj.chunks.count()

    @admin.action(description="Re-process selected documents")
    def reprocess_documents(self, request, queryset):
        for document in queryset:
            process_document.delay(document.pk)
        self.message_user(request, f"Queued {queryset.count()} document(s) for processing.")


@admin.register(Chunk)
class ChunkAdmin(admin.ModelAdmin):
    list_display = ["document", "chunk_index", "page_number", "token_count"]
    list_filter = ["business", "document"]
    search_fields = ["content"]
    exclude = ["embedding"]  # 1536 numbers; not useful to view in admin