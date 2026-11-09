from celery import shared_task
from openai import APIConnectionError, APITimeoutError, InternalServerError, RateLimitError

from .services.ingestion import ingest_document

# Only temporary problems are retried. Errors like a wrong API key or a
# scanned PDF would fail again, so those are not retried.
TEMPORARY_ERRORS = (APIConnectionError, APITimeoutError, InternalServerError, RateLimitError)


@shared_task(
    autoretry_for=TEMPORARY_ERRORS,
    retry_backoff=True,      # wait 1s, 2s, 4s... between retries
    max_retries=3,
)
def process_document(document_id):
    return ingest_document(document_id)