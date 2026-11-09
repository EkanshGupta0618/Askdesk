import os

from rest_framework import serializers

from .models import Document

MAX_UPLOAD_MB = 10


class DocumentSerializer(serializers.ModelSerializer):
    file = serializers.FileField(write_only=True)
    file_name = serializers.SerializerMethodField()
    chunk_count = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            "id", "title", "file", "file_name", "status", "error_message",
            "chunk_count", "created_at", "updated_at",
        ]
        read_only_fields = ["status", "error_message", "created_at", "updated_at"]

    def get_file_name(self, obj) -> str:
        return os.path.basename(obj.file.name) if obj.file else ""

    def get_chunk_count(self, obj) -> int:
        # Uses the annotated count in list views; falls back to a query after create
        count = getattr(obj, "chunk_count", None)
        return count if count is not None else obj.chunks.count()

    def validate_file(self, file):
        if file.size > MAX_UPLOAD_MB * 1024 * 1024:
            raise serializers.ValidationError(f"The file must be {MAX_UPLOAD_MB} MB or smaller.")
        if not file.name.lower().endswith(".pdf"):
            raise serializers.ValidationError("Only PDF files are supported.")
        # Check the file's real content, not just its name
        header = file.read(5)
        file.seek(0)
        if header != b"%PDF-":
            raise serializers.ValidationError("This file is not a valid PDF.")
        return file


class DocumentUpdateSerializer(serializers.ModelSerializer):
    """Only the title can change after upload; a new file means a new document."""

    class Meta:
        model = Document
        fields = ["id", "title"]