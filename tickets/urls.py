from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import TicketCreateView, TicketViewSet

router = DefaultRouter()
router.register("tickets", TicketViewSet, basename="ticket")

urlpatterns = [
    # Public widget endpoint (business API key), kept apart from the dashboard routes
    path("public/tickets/", TicketCreateView.as_view(), name="ticket-create"),
] + router.urls