from datetime import timedelta

from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from chat.models import Conversation, Message
from documents.models import Document
from tenants.models import Business
from tickets.models import Ticket

URL = reverse("analytics-overview")


def make_business(name):
    owner = User.objects.create_user(username=name, email=f"{name}@example.com", password="pass12345")
    return owner, Business.objects.create(name=name, slug=name, owner=owner)


def ask(business, question, answered, latency_ms=1000, when=None, conversation=None):
    """One customer question plus the assistant's reply, optionally backdated."""
    conversation = conversation or Conversation.objects.create(business=business)
    when = when or timezone.now()
    user_msg = Message.objects.create(conversation=conversation, role=Message.Role.USER, content=question)
    reply = Message.objects.create(
        conversation=conversation,
        role=Message.Role.ASSISTANT,
        content="answer",
        answered=answered,
        latency_ms=latency_ms,
    )
    # created_at is auto_now_add, so backdate with update()
    Message.objects.filter(pk=user_msg.pk).update(created_at=when)
    Message.objects.filter(pk=reply.pk).update(created_at=when + timedelta(seconds=1))
    return conversation


class OverviewTests(APITestCase):
    def setUp(self):
        self.owner, self.business = make_business("brewhaven")
        self.other_owner, self.other = make_business("rival")
        self.client.force_authenticate(self.owner)

    def get(self, **params):
        return self.client.get(URL, params)

    def test_unauthenticated_returns_401(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.get().status_code, 401)

    def test_invalid_days_returns_400(self):
        for value in ["14", "abc", "-7"]:
            response = self.get(days=value)
            self.assertEqual(response.status_code, 400, value)
            self.assertEqual(response.data["days"][0], "days must be 7, 30 or 90.")

    def test_no_data_returns_zeros_and_nulls(self):
        response = self.get()
        self.assertEqual(response.status_code, 200)
        data = response.data
        for field in ["questions", "previous_questions", "conversations", "answered", "unanswered",
                      "open_tickets", "tickets_created"]:
            self.assertEqual(data[field], 0, field)
        for field in ["answer_rate", "avg_latency_ms", "p90_latency_ms", "avg_resolution_hours"]:
            self.assertIsNone(data[field], field)
        self.assertEqual(data["top_unanswered"], [])
        self.assertEqual(data["documents"], {"total": 0, "ready": 0, "processing": 0, "failed": 0})
        self.assertTrue(all(day["questions"] == 0 and day["unanswered"] == 0 for day in data["daily"]))

    def test_daily_has_one_entry_per_day(self):
        for days in [7, 30, 90]:
            daily = self.get(days=days).data["daily"]
            self.assertEqual(len(daily), days)
            self.assertEqual(daily[-1]["date"], timezone.localdate().isoformat())

    def test_counts_rates_and_latency(self):
        conversation = ask(self.business, "Opening hours?", True, latency_ms=1000)
        ask(self.business, "Do you deliver?", True, latency_ms=2000, conversation=conversation)
        ask(self.business, "Who is the CEO?", False, latency_ms=3000)
        ask(self.business, "Old question", True, when=timezone.now() - timedelta(days=40))  # previous period

        Ticket.objects.create(business=self.business, customer_email="a@example.com", question="q1")
        resolved = Ticket.objects.create(
            business=self.business, customer_email="b@example.com", question="q2", status=Ticket.Status.RESOLVED
        )
        Ticket.objects.filter(pk=resolved.pk).update(
            created_at=timezone.now() - timedelta(hours=5), resolved_at=timezone.now() - timedelta(hours=1)
        )
        Document.objects.create(business=self.business, title="FAQ", file="faq.pdf", status=Document.Status.READY)
        Document.objects.create(business=self.business, title="Bad", file="bad.pdf", status=Document.Status.FAILED)

        data = self.get(days=30).data
        self.assertEqual(data["questions"], 3)
        self.assertEqual(data["previous_questions"], 1)
        self.assertEqual(data["conversations"], 3)  # created_at isn't backdated, so all count
        self.assertEqual(data["answered"], 2)
        self.assertEqual(data["unanswered"], 1)
        self.assertAlmostEqual(data["answer_rate"], 2 / 3)
        self.assertEqual(data["avg_latency_ms"], 2000)
        self.assertEqual(data["p90_latency_ms"], 2800)  # percentile_cont over 1000, 2000, 3000
        self.assertEqual(data["open_tickets"], 1)
        self.assertEqual(data["tickets_created"], 2)
        self.assertEqual(data["avg_resolution_hours"], 4.0)
        self.assertEqual(data["documents"], {"total": 2, "ready": 1, "processing": 0, "failed": 1})
        self.assertEqual(sum(day["questions"] for day in data["daily"]), 3)
        self.assertEqual(sum(day["unanswered"] for day in data["daily"]), 1)

    def test_other_business_is_not_counted(self):
        ask(self.other, "Rival question", False)
        Ticket.objects.create(business=self.other, customer_email="x@example.com", question="q")
        Document.objects.create(business=self.other, title="Theirs", file="t.pdf")

        data = self.get().data
        self.assertEqual(data["questions"], 0)
        self.assertEqual(data["unanswered"], 0)
        self.assertEqual(data["open_tickets"], 0)
        self.assertEqual(data["tickets_created"], 0)
        self.assertEqual(data["documents"]["total"], 0)
        self.assertEqual(data["top_unanswered"], [])

    def test_top_unanswered_groups_case_and_whitespace(self):
        ask(self.business, "Who is the CEO?", False, when=timezone.now() - timedelta(hours=2))
        latest = ask(self.business, " who is the ceo? ", False, when=timezone.now() - timedelta(hours=1))
        ask(self.business, "Do you sell gift cards?", False, when=timezone.now() - timedelta(hours=3))
        ask(self.business, "Opening hours?", True)

        top = self.get().data["top_unanswered"]
        self.assertEqual(len(top), 2)
        self.assertEqual(top[0]["count"], 2)
        self.assertEqual(top[0]["question"], "who is the ceo?")  # most recent wording, trimmed
        self.assertEqual(str(top[0]["conversation_id"]), str(latest.pk))
        self.assertEqual(top[1]["question"], "Do you sell gift cards?")
        self.assertEqual(top[1]["count"], 1)
