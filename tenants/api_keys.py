from urllib.parse import urlsplit

from drf_spectacular.utils import OpenApiParameter
from rest_framework import status
from rest_framework.response import Response

from .models import Business

API_KEY_HEADER = OpenApiParameter(
    name="X-API-Key",
    location=OpenApiParameter.HEADER,
    required=True,
    description="The business's API key",
)

ORIGIN_NOT_ALLOWED = {"detail": "This website isn't allowed to use this assistant."}


def get_business_from_api_key(request):
    """The active business for the X-API-Key header, or None."""
    api_key = request.headers.get("X-API-Key")
    if not api_key:
        return None
    return Business.objects.filter(api_key=api_key, is_active=True).first()


def origin_allowed(business, request):
    """Is the request's Origin (host[:port]) in the business's allowed_domains?"""
    allowed = business.allowed_domains or []
    if not allowed:
        return True
    origin = request.headers.get("Origin")
    if not origin:
        # No Origin = not a browser cross-site request; rate limits cover non-browser clients
        return True
    host = urlsplit(origin).netloc.lower()
    return host in {domain.lower() for domain in allowed}


def origin_denied_response():
    return Response(ORIGIN_NOT_ALLOWED, status=status.HTTP_403_FORBIDDEN)
