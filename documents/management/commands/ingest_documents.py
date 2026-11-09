from django.core.management.base import BaseCommand, CommandError

from documents.models import Document
from documents.services.ingestion import ingest_document


class Command(BaseCommand):
    help = "Extract, chunk, and embed documents."

    def add_arguments(self, parser):
        parser.add_argument("document_ids", nargs="*", type=int)
        parser.add_argument(
            "--pending",
            action="store_true",
            help="Process every document that is not ready yet.",
        )

    def handle(self, *args, **options):
        ids = options["document_ids"]
        if options["pending"]:
            ids = list(
                Document.objects.exclude(status=Document.Status.READY)
                .values_list("id", flat=True)
            )
            if not ids:
                self.stdout.write(
                    "No pending documents found. Upload a Document in /admin/ first, "
                    "or pass an ID to re-process a ready one."
                )
                return
        elif not ids:
            raise CommandError("Pass document IDs, or use --pending.")

        for doc_id in ids:
            try:
                count = ingest_document(doc_id)
                self.stdout.write(self.style.SUCCESS(f"Document {doc_id}: {count} chunks created"))
            except Document.DoesNotExist:
                self.stderr.write(self.style.ERROR(f"Document {doc_id}: not found"))
            except Exception as exc:
                self.stderr.write(self.style.ERROR(f"Document {doc_id}: failed - {exc}"))