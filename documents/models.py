from django.conf import settings
from django.db import models
from pgvector.django import HnswIndex, VectorField


def document_upload_path(instance, filename):
    # Keeps each business's files in its own folder: media/documents/<business_id>/<file>
    return f"documents/{instance.business_id}/{filename}"


class Document(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    business = models.ForeignKey(
        "tenants.Business",
        on_delete=models.CASCADE,
        related_name="documents",
    )
    title = models.CharField(max_length=255)
    file = models.FileField(upload_to=document_upload_path)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PROCESSING,
    )
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class Chunk(models.Model):
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    # Stored on the chunk too, so retrieval can filter by business
    # before the vector search, without joining Document on every query.
    business = models.ForeignKey(
        "tenants.Business",
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    content = models.TextField()
    page_number = models.PositiveIntegerField()
    chunk_index = models.PositiveIntegerField()
    token_count = models.PositiveIntegerField()
    embedding = VectorField(dimensions=settings.EMBEDDING_DIMENSIONS)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["document", "chunk_index"]
        indexes = [
            HnswIndex(
                name="chunk_embedding_hnsw_idx",
                fields=["embedding"],
                m=16,
                ef_construction=64,
                opclasses=["vector_cosine_ops"],
            ),
        ]

    def __str__(self):
        return f"{self.document.title} - chunk {self.chunk_index} (page {self.page_number})"