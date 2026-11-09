from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AskStreamView, AskView, ConversationViewSet

router = DefaultRouter()
router.register("conversations", ConversationViewSet, basename="conversation")

urlpatterns = [
    path("ask/", AskView.as_view(), name="ask"),
    path("ask/stream/", AskStreamView.as_view(), name="ask-stream"),
] + router.urls
