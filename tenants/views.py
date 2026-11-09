from drf_spectacular.utils import extend_schema
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from .api_keys import API_KEY_HEADER, get_business_from_api_key, origin_allowed, origin_denied_response
from .mixins import BusinessScopedMixin
from .serializers import BusinessSettingsSerializer, WidgetConfigSerializer


class WidgetConfigView(APIView):
    """Public: what the widget needs to render itself (name, greeting, colour)."""

    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "widget"

    @extend_schema(responses={200: WidgetConfigSerializer}, parameters=[API_KEY_HEADER])
    def get(self, request):
        business = get_business_from_api_key(request)
        if business is None:
            return Response({"detail": "Invalid or missing API key."}, status=status.HTTP_401_UNAUTHORIZED)
        if not origin_allowed(business, request):
            return origin_denied_response()
        return Response({
            "business_name": business.name,
            "greeting": business.greeting,
            "color": business.widget_color,
        })


class BusinessSettingsView(BusinessScopedMixin, generics.RetrieveUpdateAPIView):
    """GET / PATCH /api/business/ — the owner's business name and widget settings."""

    permission_classes = [IsAuthenticated]
    serializer_class = BusinessSettingsSerializer
    http_method_names = ["get", "patch"]

    def get_object(self):
        return self.get_business()
