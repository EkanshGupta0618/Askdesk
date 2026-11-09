import smtplib

from celery import shared_task
from django.core.mail import send_mail

from .models import Ticket


@shared_task(
    autoretry_for=(smtplib.SMTPException, OSError),  # mail server or network problems
    retry_backoff=True,
    max_retries=3,
)
def notify_owner_of_ticket(ticket_id):
    ticket = Ticket.objects.select_related("business__owner").get(pk=ticket_id)
    owner_email = ticket.business.owner.email
    if not owner_email:
        return "skipped: owner has no email"

    send_mail(
        subject=f"[AskDesk] New support ticket #{ticket.pk} from {ticket.customer_email}",
        message=(
            f"A customer needs help that your assistant couldn't give.\n\n"
            f"Name: {ticket.customer_name or '-'}\n"
            f"Email: {ticket.customer_email}\n"
            f"Question: {ticket.question}\n"
            f"Details: {ticket.details or '-'}\n"
        ),
        from_email=None,  # uses DEFAULT_FROM_EMAIL
        recipient_list=[owner_email],
    )
    return "sent"