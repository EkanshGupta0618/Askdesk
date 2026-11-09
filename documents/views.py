from django.db.models import Count
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from tenants.mixins import BusinessScopedMixin

from .models import Document
from .serializers import DocumentSerializer, DocumentUpdateSerializer
from .tasks import process_document


class DocumentViewSet(BusinessScopedMixin, viewsets.ModelViewSet):
    """
    list:     GET    /api/documents/
    upload:   POST   /api/documents/            (multipart: title, file)
    detail:   GET    /api/documents/{id}/
    rename:   PATCH  /api/documents/{id}/       (title)
    delete:   DELETE /api/documents/{id}/
    re-run:   POST   /api/documents/{id}/reprocess/
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    http_method_names = ["get", "post", "patch", "delete"]

    def get_queryset(self):
        # Swagger builds the docs without a logged-in user; give it an empty queryset
        if getattr(self, "swagger_fake_view", False):
            return Document.objects.none()
        # Only this owner's business: another business's document IDs return 404
        return (
            Document.objects.filter(business=self.get_business())
            .annotate(chunk_count=Count("chunks"))
            .order_by("-created_at")
        )

    def get_serializer_class(self):
        if self.action == "partial_update":
            return DocumentUpdateSerializer
        return DocumentSerializer

    def perform_create(self, serializer):
        # The post_save signal queues processing in Celery
        serializer.save(business=self.get_business())

    @action(detail=True, methods=["post"])
    def reprocess(self, request, pk=None):
        document = self.get_object()
        document.status = Document.Status.PROCESSING
        document.error_message = ""
        document.save(update_fields=["status", "error_message", "updated_at"])
        process_document.delay(document.pk)
        return Response({"detail": "Re-processing started."}, status=status.HTTP_202_ACCEPTED)