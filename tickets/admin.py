from django.contrib import admin

from .models import Ticket


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ["id", "business", "customer_email", "status", "created_at"]
    list_filter = ["status", "business"]
    search_fields = ["customer_email", "question"]
    readonly_fields = ["created_at", "updated_at", "resolved_at"]