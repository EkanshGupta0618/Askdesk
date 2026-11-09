import re

from django.db import transaction
from pypdf import PdfReader

from documents.models import Chunk, Document

from .chunking import build_chunks
from .embeddings import embed_texts


def clean_text(text):
    text = text.replace("\x00", "")           # PostgreSQL rejects null bytes
    text = re.sub(r"[ \t]+", " ", text)       # collapse repeated spaces
    text = re.sub(r"\n{3,}", "\n\n", text)    # collapse large blank gaps
    return text.strip()


def extract_pages(file_path):
    """Return a list of (page_number, text) for pages that contain text."""
    reader = PdfReader(file_path)
    pages = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = clean_text(page.extract_text() or "")
        if text:
            pages.append((page_number, text))
    return pages


def ingest_document(document_id):
    """Extract, chunk, embed, and store one document. Returns the number of chunks."""
    document = Document.objects.get(pk=document_id)
    document.status = Document.Status.PROCESSING
    document.error_message = ""
    document.save(update_fields=["status", "error_message", "updated_at"])

    try:
        pages = extract_pages(document.file.path)
        if not pages:
            raise ValueError(
                "No extractable text found. The PDF may contain only scanned images."
            )

        pending = build_chunks(pages)  # [(page_number, content, token_count), ...]
        if not pending:
            raise ValueError("The document has headings but no body text to index.")

        embeddings = embed_texts([content for _, content, _ in pending])

        chunks = [
            Chunk(
                document=document,
                business_id=document.business_id,
                content=content,
                page_number=page_number,
                chunk_index=index,
                token_count=token_count,
                embedding=embedding,
            )
            for index, ((page_number, content, token_count), embedding)
            in enumerate(zip(pending, embeddings))
        ]

        # Replace old chunks atomically, so re-processing never leaves half a document
        with transaction.atomic():
            document.chunks.all().delete()
            Chunk.objects.bulk_create(chunks, batch_size=500)
            document.status = Document.Status.READY
            document.save(update_fields=["status", "updated_at"])

        return len(chunks)

    except Exception as exc:
        document.status = Document.Status.FAILED
        document.error_message = str(exc)[:2000]
        document.save(update_fields=["status", "error_message", "updated_at"])
        raise