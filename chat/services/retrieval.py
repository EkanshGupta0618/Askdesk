from pgvector.django import CosineDistance

from documents.models import Chunk, Document
from documents.services.embeddings import embed_query


def retrieve_chunks(business, question, top_k=5):
    """Return the top_k chunks most similar to the question, for one business only."""
    query_vector = embed_query(question)
    return list(
        Chunk.objects.filter(
            business=business,
            document__status=Document.Status.READY,
        )
        .select_related("document")
        .annotate(distance=CosineDistance("embedding", query_vector))
        .order_by("distance")[:top_k]
    )