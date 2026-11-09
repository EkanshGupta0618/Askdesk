from django.db import transaction
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import mixins, status, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from chat.models import Conversation
from tenants.api_keys import (
    API_KEY_HEADER,
    get_business_from_api_key,
    origin_allowed,
    origin_denied_response,
)
from tenants.mixins import BusinessScopedMixin

from .models import Ticket
from .serializers import TicketCreatedSerializer, TicketCreateSerializer, TicketSerializer
from .tasks import notify_owner_of_ticket


class TicketCreateView(APIView):
    """Public: the widget creates a ticket when the assistant can't answer."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "ticket"

    @extend_schema(
        request=TicketCreateSerializer,
        responses={201: TicketCreatedSerializer, 200: TicketCreatedSerializer},
        parameters=[API_KEY_HEADER],
    )
    def post(self, request):
        business = get_business_from_api_key(request)
        if business is None:
            return Response({"detail": "Invalid or missing API key."}, status=status.HTTP_401_UNAUTHORIZED)
        if not origin_allowed(business, request):
            return origin_denied_response()

        serializer = TicketCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        email = data["email"].lower()
        question = data["question"].strip()

        # Duplicate check: the same customer already has an unresolved ticket for this question
        existing = Ticket.objects.filter(
            business=business,
            customer_email__iexact=email,
            question__iexact=question,
            status__in=[Ticket.Status.OPEN, Ticket.Status.IN_PROGRESS],
        ).first()
        if existing:
            return Response(
                {"id": existing.pk, "message": "We already have your request. Our support team will get back to you by email."},
                status=status.HTTP_200_OK,
            )

        # Link the conversation only if it belongs to this business
        conversation = None
        if data.get("conversation_id"):
            conversation = Conversation.objects.filter(pk=data["conversation_id"], business=business).first()

        ticket = Ticket.objects.create(
            business=business,
            conversation=conversation,
            customer_name=data.get("name", ""),
            customer_email=email,
            question=question,
            details=data.get("details", ""),
        )
        transaction.on_commit(lambda: notify_owner_of_ticket.delay(ticket.pk))

        return Response(
            {"id": ticket.pk, "message": "Thanks! Our support team will get back to you by email."},
            status=status.HTTP_201_CREATED,
        )


class TicketPagination(PageNumberPagination):
    page_size = 20


@extend_schema_view(
    list=extend_schema(
        parameters=[
            OpenApiParameter(
                name="status",
                type=OpenApiTypes.STR,
                enum=[choice.value for choice in Ticket.Status],
                description="Only tickets with this status",
            )
        ]
    )
)
class TicketViewSet(
    BusinessScopedMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """
    list:    GET   /api/tickets/              (?status=open)
    detail:  GET   /api/tickets/{id}/
    update:  PATCH /api/tickets/{id}/         (status only)
    """

    permission_classes = [IsAuthenticated]
    serializer_class = TicketSerializer
    pagination_class = TicketPagination
    http_method_names = ["get", "patch"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Ticket.objects.none()
        queryset = Ticket.objects.filter(business=self.get_business())
        status_filter = self.request.query_params.get("status")
        if status_filter in Ticket.Status.values:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by("-created_at")