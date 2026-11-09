import hashlib

from django.conf import settings
from django.core.cache import cache
from openai import OpenAI

# Number of texts sent to the embeddings API per request
BATCH_SIZE = 100

_client = None


def get_client():
    global _client
    if _client is None:
        _client = OpenAI(
            api_key=settings.OPENAI_API_KEY,
            timeout=20.0,     # seconds before giving up on a request
            max_retries=2,    # automatic retries on network errors and rate limits
        )
    return _client


def embed_texts(texts):
    """Return one embedding vector per input text, in the same order."""
    client = get_client()
    vectors = []
    for start in range(0, len(texts), BATCH_SIZE):
        batch = texts[start:start + BATCH_SIZE]
        response = client.embeddings.create(
            model=settings.EMBEDDING_MODEL,
            input=batch,
        )
        # Sort by index so vectors always line up with the input texts
        ordered = sorted(response.data, key=lambda item: item.index)
        vectors.extend(item.embedding for item in ordered)
    return vectors


def embed_query(text):
    """Embed a single question, cached so repeated questions skip the API call."""
    normalized = " ".join(text.lower().split())
    key = "qemb:" + hashlib.sha256(
        f"{settings.EMBEDDING_MODEL}:{normalized}".encode()
    ).hexdigest()
    vector = cache.get(key)
    if vector is None:
        vector = embed_texts([text])[0]
        cache.set(key, vector, timeout=60 * 60 * 24)  # 24 hours
    return vector