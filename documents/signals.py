from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from .models import Document
from .tasks import process_document


@receiver(post_save, sender=Document)
def queue_document_processing(sender, instance, created, **kwargs):
    if created:
        # Wait until the database transaction commits, so the worker
        # never looks for a document that isn't saved yet.
        transaction.on_commit(lambda: process_document.delay(instance.pk))


@receiver(post_delete, sender=Document)
def delete_document_file(sender, instance, **kwargs):
    # Django removes the database row but not the file; remove the PDF too
    if instance.file:
        transaction.on_commit(lambda: instance.file.delete(save=False))