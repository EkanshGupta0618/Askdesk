import json
import logging
import re
import time

from django.conf import settings
from django.db.models import Count, OuterRef, Q, Subquery
from django.http import StreamingHttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from openai import OpenAIError
from rest_framework import status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.renderers import BaseRenderer, JSONRenderer
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from tenants.api_keys import (
    API_KEY_HEADER,
    get_business_from_api_key,
    origin_allowed,
    origin_denied_response,
)
from tenants.mixins import BusinessScopedMixin

from .models import Conversation, Message
from .serializers import (
    AskResponseSerializer,
    AskSerializer,
    ConversationDetailSerializer,
    ConversationListSerializer,
)
from .services.conversations import (
    get_or_create_conversation,
    save_assistant_message,
    save_user_message,
)
from .services.llm import FALLBACK_ANSWER, generate_answer, stream_answer
from .services.retrieval import retrieve_chunks

logger = logging.getLogger(__name__)

CITATION_PATTERN = re.compile(r"\[(\d+)\]")
FALLBACK_RESPONSE = {"answered": False, "answer": FALLBACK_ANSWER, "sources": []}
UNAVAILABLE = {"detail": "The assistant is temporarily unavailable. Please try again in a moment."}

# Characters to collect before deciding whether the model is giving the fallback
FALLBACK_CHECK_CHARS = 20

# ---------- shared helpers ----------

def is_fallback(answer):
    normalized = answer.replace("\u2019", "'").strip().strip("\"'").lower()
    return normalized.startswith("i'm not sure")


def is_relevant(chunks):
    """Layer 1: is even the best chunk close enough to be worth asking the LLM?"""
    return bool(chunks) and chunks[0].distance <= settings.RETRIEVAL_MAX_DISTANCE


def build_sources(chunks, answer):
    cited = {int(n) for n in CITATION_PATTERN.findall(answer)}
    return [
        {
            "number": number,
            "document_id": chunk.document_id,
            "document_title": chunk.document.title,
            "page_number": chunk.page_number,
            "snippet": chunk.content[:200],
            "distance": round(chunk.distance, 4),
        }
        for number, chunk in enumerate(chunks, start=1)
        if number in cited
    ]


def elapsed_ms(start):
    return int((time.perf_counter() - start) * 1000)


def sse(event, data):
    """Format one Server-Sent Event."""
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


# ---------- public ask endpoints (business API key) ----------

class AskView(APIView):
    """Answer a question and return the complete answer at once."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ask"

    @extend_schema(request=AskSerializer, responses={200: AskResponseSerializer}, parameters=[API_KEY_HEADER])
    def post(self, request):
        start = time.perf_counter()

        business = get_business_from_api_key(request)
        if business is None:
            return Response({"detail": "Invalid or missing API key."}, status=status.HTTP_401_UNAUTHORIZED)
        if not origin_allowed(business, request):
            return origin_denied_response()

        serializer = AskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data["question"]

        conversation = get_or_create_conversation(business, serializer.validated_data.get("conversation_id"))
        save_user_message(conversation, question)

        try:
            chunks = retrieve_chunks(business, question)
            if not is_relevant(chunks):
                result = FALLBACK_RESPONSE
            else:
                answer = generate_answer(business.name, question, chunks)
                if is_fallback(answer):  # Layer 2: the LLM found no answer in the sources
                    result = FALLBACK_RESPONSE
                else:
                    result = {"answered": True, "answer": answer, "sources": build_sources(chunks, answer)}
        except OpenAIError:
            logger.exception("OpenAI request failed for business %s", business.pk)
            return Response(
                {**UNAVAILABLE, "conversation_id": str(conversation.pk)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        save_assistant_message(conversation, result, elapsed_ms(start))
        return Response({**result, "conversation_id": str(conversation.pk)})


class EventStreamRenderer(BaseRenderer):
    """
    Lets DRF content negotiation accept `Accept: text/event-stream` (otherwise it
    returns 406 before the view runs). The stream itself is a StreamingHttpResponse
    and bypasses renderers; this only renders error Responses (401/400/429/503) as JSON.
    """

    media_type = "text/event-stream"
    format = "event-stream"
    charset = "utf-8"

    def render(self, data, accepted_media_type=None, renderer_context=None):
        if data is None:
            return b""
        return json.dumps(data).encode(self.charset)


class AskStreamView(APIView):
    """
    Answer a question as a stream of Server-Sent Events:
      event: start  -> {"conversation_id"}                          (once, first)
      event: token  -> {"text": "..."}                              (repeated)
      event: done   -> {"conversation_id", "answered", "answer", "sources"}  (once, last)
      event: error  -> {"detail": "..."}                            (if OpenAI fails mid-stream)
    """

    renderer_classes = [JSONRenderer, EventStreamRenderer]
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ask"

    @extend_schema(
        request=AskSerializer,
        responses={(200, "text/event-stream"): OpenApiTypes.STR},
        parameters=[API_KEY_HEADER],
    )
    def post(self, request):
        start = time.perf_counter()

        business = get_business_from_api_key(request)
        if business is None:
            return Response({"detail": "Invalid or missing API key."}, status=status.HTTP_401_UNAUTHORIZED)
        if not origin_allowed(business, request):
            return origin_denied_response()

        serializer = AskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        question = serializer.validated_data["question"]

        conversation = get_or_create_conversation(business, serializer.validated_data.get("conversation_id"))
        save_user_message(conversation, question)

        # Retrieval happens before streaming starts, so its errors can still return a normal 503
        try:
            chunks = retrieve_chunks(business, question)
        except OpenAIError:
            logger.exception("OpenAI embedding failed for business %s", business.pk)
            return Response(
                {**UNAVAILABLE, "conversation_id": str(conversation.pk)},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        response = StreamingHttpResponse(
            self.stream_events(business, conversation, question, chunks, start),
            content_type="text/event-stream",
        )
        response["Cache-Control"] = "no-cache"
        response["X-Accel-Buffering"] = "no"  # stops Nginx from buffering the stream in production
        return response

    def stream_events(self, business, conversation, question, chunks, start):
        yield sse("start", {"conversation_id": str(conversation.pk)})

        if not is_relevant(chunks):
            yield from self.finish(conversation, FALLBACK_RESPONSE, start)
            return

        answer = ""
        started = False  # becomes True once we've confirmed it's a real answer

        try:
            for piece in stream_answer(business.name, question, chunks):
                answer += piece
                if started:
                    yield sse("token", {"text": piece})
                elif len(answer) >= FALLBACK_CHECK_CHARS:
                    # Hold back the first few characters, so a fallback reply
                    # is never shown to the user word by word
                    if is_fallback(answer):
                        break
                    started = True
                    yield sse("token", {"text": answer})
        except OpenAIError:
            logger.exception("OpenAI streaming failed for business %s", business.pk)
            yield sse("error", UNAVAILABLE)
            return

        if not answer.strip() or is_fallback(answer):
            yield from self.finish(conversation, FALLBACK_RESPONSE, start)
            return

        if not started:
            # The whole answer was shorter than FALLBACK_CHECK_CHARS
            yield sse("token", {"text": answer})

        answer = answer.strip()
        result = {"answered": True, "answer": answer, "sources": build_sources(chunks, answer)}
        yield from self.finish(conversation, result, start)

    def finish(self, conversation, result, start):
        save_assistant_message(conversation, result, elapsed_ms(start))
        yield sse("done", {**result, "conversation_id": str(conversation.pk)})


# ---------- dashboard endpoints (logged-in business owner) ----------

class ConversationPagination(PageNumberPagination):
    page_size = 20


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter(
                name="unanswered",
                type=OpenApiTypes.BOOL,
                description="true = only conversations with at least one unanswered question",
            )
        ]
    )
)
class ConversationViewSet(BusinessScopedMixin, viewsets.ReadOnlyModelViewSet):
    """
    list:    GET /api/chat/conversations/              (?unanswered=true)
    detail:  GET /api/chat/conversations/{id}/         (with all messages)
    """

    permission_classes = [IsAuthenticated]
    pagination_class = ConversationPagination

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Conversation.objects.none()

        first_question = (
            Message.objects.filter(conversation=OuterRef("pk"), role=Message.Role.USER)
            .order_by("created_at")
            .values("content")[:1]
        )
        queryset = Conversation.objects.filter(business=self.get_business()).annotate(
            question_count=Count("messages", filter=Q(messages__role=Message.Role.USER)),
            unanswered_count=Count(
                "messages",
                filter=Q(messages__role=Message.Role.ASSISTANT, messages__answered=False),
            ),
            first_question=Subquery(first_question),
        )

        if self.request.query_params.get("unanswered") == "true":
            queryset = queryset.filter(unanswered_count__gt=0)
        if self.action == "retrieve":
            queryset = queryset.prefetch_related("messages")
        return queryset.order_by("-updated_at")

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ConversationDetailSerializer
        return ConversationListSerializer