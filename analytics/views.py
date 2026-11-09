from datetime import datetime, time, timedelta

from django.contrib.postgres.aggregates import ArrayAgg
from django.db.models import Aggregate, Avg, Count, F, FloatField, Max, OuterRef, Q, Subquery
from django.db.models.functions import Lower, TruncDate, Trim
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from chat.models import Conversation, Message
from documents.models import Document
from tenants.mixins import BusinessScopedMixin
from tickets.models import Ticket

from .serializers import PERIOD_CHOICES, OverviewQuerySerializer, OverviewSerializer

TOP_UNANSWERED_LIMIT = 5


class Percentile90(Aggregate):
    """PostgreSQL's percentile_cont(0.9), so p90 is computed in the database."""

    function = "PERCENTILE_CONT"
    name = "Percentile90"
    template = "%(function)s(0.9) WITHIN GROUP (ORDER BY %(expressions)s)%(filter)s"
    output_field = FloatField()


def get_period(days):
    """The last `days` calendar days (local time), today included and ending now."""
    now = timezone.now()
    today = timezone.localdate(now)
    first_day = today - timedelta(days=days - 1)
    start = timezone.make_aware(datetime.combine(first_day, time.min))
    previous_start = start - timedelta(days=days)
    return now, start, previous_start, [first_day + timedelta(days=i) for i in range(days)]


def round_or_none(value):
    return None if value is None else round(value)


class OverviewView(BusinessScopedMixin, APIView):
    """GET /api/analytics/overview/?days=30 — headline numbers for the dashboard."""

    permission_classes = [IsAuthenticated]

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="days",
                type=OpenApiTypes.INT,
                enum=PERIOD_CHOICES,
                default=30,
                description="Length of the period in days, ending now",
            )
        ],
        responses={200: OverviewSerializer},
    )
    def get(self, request):
        query = OverviewQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        days = query.validated_data["days"]

        business = self.get_business()
        now, start, previous_start, dates = get_period(days)

        messages = Message.objects.filter(conversation__business=business)
        in_period = Q(created_at__gte=start)
        is_question = Q(role=Message.Role.USER)
        is_reply = Q(role=Message.Role.ASSISTANT)
        has_latency = in_period & is_reply & Q(latency_ms__isnull=False)

        # 1. Message totals for this period and the previous one
        totals = messages.filter(created_at__gte=previous_start).aggregate(
            questions=Count("id", filter=in_period & is_question),
            previous_questions=Count("id", filter=Q(created_at__lt=start) & is_question),
            # Aliases differ from the Message.answered field, which the filters use
            answered_count=Count("id", filter=in_period & is_reply & Q(answered=True)),
            unanswered_count=Count("id", filter=in_period & is_reply & Q(answered=False)),
            avg_latency_ms=Avg("latency_ms", filter=has_latency),
            p90_latency_ms=Percentile90("latency_ms", filter=has_latency),
        )
        replied = totals["answered_count"] + totals["unanswered_count"]

        # 2. Questions and unanswered replies per day, then fill the days with none
        per_day = (
            messages.filter(in_period)
            .annotate(date=TruncDate("created_at"))
            .values("date")
            .annotate(
                questions=Count("id", filter=is_question),
                unanswered=Count("id", filter=is_reply & Q(answered=False)),
            )
        )
        counts = {row["date"]: row for row in per_day}
        daily = [
            {
                "date": date,
                "questions": counts.get(date, {}).get("questions", 0),
                "unanswered": counts.get(date, {}).get("unanswered", 0),
            }
            for date in dates
        ]

        # 3. Conversations started in the period
        conversations = Conversation.objects.filter(business=business, created_at__gte=start).count()

        # 4. Tickets: open right now, created and resolved in the period
        tickets = Ticket.objects.filter(business=business).aggregate(
            open_tickets=Count(
                "id", filter=Q(status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS])
            ),
            tickets_created=Count("id", filter=Q(created_at__gte=start)),
            avg_resolution=Avg(
                F("resolved_at") - F("created_at"),
                filter=Q(status=Ticket.Status.RESOLVED, resolved_at__gte=start),
            ),
        )
        avg_resolution = tickets["avg_resolution"]

        # 5. Document health
        documents = Document.objects.filter(business=business).aggregate(
            total=Count("id"),
            ready=Count("id", filter=Q(status=Document.Status.READY)),
            processing=Count("id", filter=Q(status=Document.Status.PROCESSING)),
            failed=Count("id", filter=Q(status=Document.Status.FAILED)),
        )

        return Response(
            OverviewSerializer(
                {
                    "period": {"days": days, "start": start, "end": now},
                    "questions": totals["questions"],
                    "previous_questions": totals["previous_questions"],
                    "conversations": conversations,
                    "answered": totals["answered_count"],
                    "unanswered": totals["unanswered_count"],
                    "answer_rate": totals["answered_count"] / replied if replied else None,
                    "avg_latency_ms": round_or_none(totals["avg_latency_ms"]),
                    "p90_latency_ms": round_or_none(totals["p90_latency_ms"]),
                    "open_tickets": tickets["open_tickets"],
                    "tickets_created": tickets["tickets_created"],
                    "avg_resolution_hours": (
                        None if avg_resolution is None else round(avg_resolution.total_seconds() / 3600, 1)
                    ),
                    "daily": daily,
                    "top_unanswered": self.top_unanswered(messages, start),
                    "documents": documents,
                }
            ).data
        )

    @staticmethod
    def top_unanswered(messages, start):
        """6. The questions asked most often that the assistant couldn't answer."""
        # The customer's question is the last user message before the unanswered reply
        question = (
            Message.objects.filter(
                conversation=OuterRef("conversation"),
                role=Message.Role.USER,
                created_at__lte=OuterRef("created_at"),
            )
            .order_by("-created_at", "-id")
            .values("content")[:1]
        )
        rows = (
            messages.filter(created_at__gte=start, role=Message.Role.ASSISTANT, answered=False)
            .annotate(question=Trim(Subquery(question)))
            .exclude(question__isnull=True)
            .annotate(key=Lower("question"))
            .values("key")
            .annotate(
                count=Count("id"),
                last_asked_at=Max("created_at"),
                # Newest first, so [0] is the most recent wording and conversation
                texts=ArrayAgg("question", order_by=("-created_at", "-id")),
                conversation_ids=ArrayAgg("conversation_id", order_by=("-created_at", "-id")),
            )
            .order_by("-count", "-last_asked_at")[:TOP_UNANSWERED_LIMIT]
        )
        return [
            {
                "question": row["texts"][0],
                "count": row["count"],
                "last_asked_at": row["last_asked_at"],
                "conversation_id": row["conversation_ids"][0],
            }
            for row in rows
        ]
