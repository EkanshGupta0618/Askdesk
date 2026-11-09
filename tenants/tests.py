from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework.test import APITestCase

from .models import Business

User = get_user_model()

TEST_CACHE = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
CONFIG_URL = "/api/public/widget-config/"
BUSINESS_URL = "/api/business/"


def make_business(email="owner@example.com", name="Brew Haven", slug="brew-haven", **extra):
    user = User.objects.create_user(username=email, email=email, password="pass12345!")
    return Business.objects.create(name=name, slug=slug, owner=user, **extra)


@override_settings(CACHES=TEST_CACHE)
class WidgetConfigTests(APITestCase):
    def setUp(self):
        self.business = make_business()

    def get_config(self, key=None, **headers):
        return self.client.get(CONFIG_URL, HTTP_X_API_KEY=key or self.business.api_key, **headers)

    def test_cors_header_on_widget_config(self):
        response = self.get_config(HTTP_ORIGIN="https://anysite.com")
        self.assertEqual(response["Access-Control-Allow-Origin"], "*")

    def test_cors_header_absent_on_dashboard_api(self):
        self.client.force_authenticate(self.business.owner)
        response = self.client.get("/api/documents/", HTTP_ORIGIN="https://anysite.com")
        self.assertNotIn("Access-Control-Allow-Origin", response)

    def test_defaults(self):
        response = self.get_config()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "business_name": "Brew Haven",
            "greeting": "Hi! Ask me anything about Brew Haven.",
            "color": "#13262f",
        })

    def test_custom_greeting(self):
        self.business.widget_greeting = "Welcome!"
        self.business.save()
        self.assertEqual(self.get_config().json()["greeting"], "Welcome!")

    def test_bad_key(self):
        self.assertEqual(self.get_config(key="ak_wrong").status_code, 401)

    def test_origin_allowed(self):
        self.business.allowed_domains = ["brewhaven.com", "localhost:5174"]
        self.business.save()
        self.assertEqual(self.get_config(HTTP_ORIGIN="https://BrewHaven.com").status_code, 200)
        self.assertEqual(self.get_config(HTTP_ORIGIN="http://localhost:5174").status_code, 200)

    def test_origin_denied(self):
        self.business.allowed_domains = ["brewhaven.com"]
        self.business.save()
        for origin in ["https://evil.com", "https://shop.brewhaven.com", "http://localhost:5173"]:
            response = self.get_config(HTTP_ORIGIN=origin)
            self.assertEqual(response.status_code, 403, origin)
            self.assertEqual(response.json(), {"detail": "This website isn't allowed to use this assistant."})

    def test_empty_list_allows_any_origin(self):
        self.assertEqual(self.get_config(HTTP_ORIGIN="https://anysite.com").status_code, 200)

    def test_no_origin_allowed(self):
        self.business.allowed_domains = ["brewhaven.com"]
        self.business.save()
        self.assertEqual(self.get_config().status_code, 200)

    def test_ask_and_ticket_check_origin(self):
        self.business.allowed_domains = ["brewhaven.com"]
        self.business.save()
        for url in ["/api/chat/ask/", "/api/chat/ask/stream/", "/api/public/tickets/"]:
            response = self.client.post(url, {}, format="json", HTTP_X_API_KEY=self.business.api_key,
                                        HTTP_ORIGIN="https://evil.com")
            self.assertEqual(response.status_code, 403, url)


@override_settings(CACHES=TEST_CACHE)
class BusinessSettingsTests(APITestCase):
    def setUp(self):
        self.business = make_business()
        self.client.force_authenticate(self.business.owner)

    def test_get(self):
        response = self.client.get(BUSINESS_URL)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {
            "name": "Brew Haven", "widget_greeting": "", "widget_color": "#13262f", "allowed_domains": [],
        })

    def test_patch_valid(self):
        response = self.client.patch(BUSINESS_URL, {
            "name": "Brew Haven Cafe", "widget_greeting": "Hello!", "widget_color": "#FF00aa",
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.business.refresh_from_db()
        self.assertEqual(self.business.name, "Brew Haven Cafe")
        self.assertEqual(self.business.widget_greeting, "Hello!")
        self.assertEqual(self.business.widget_color, "#FF00aa")

    def test_bad_colour(self):
        for colour in ["red", "#12345", "#gggggg", "13262f0"]:
            response = self.client.patch(BUSINESS_URL, {"widget_color": colour}, format="json")
            self.assertEqual(response.status_code, 400, colour)
            self.assertIn("widget_color", response.json())

    def test_domain_normalization(self):
        response = self.client.patch(BUSINESS_URL, {
            "allowed_domains": ["https://BrewHaven.com/", "http://localhost:5174/shop", "brewhaven.com", "Shop.Example.org"],
        }, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["allowed_domains"], ["brewhaven.com", "localhost:5174", "shop.example.org"])
        self.business.refresh_from_db()
        self.assertEqual(self.business.allowed_domains, ["brewhaven.com", "localhost:5174", "shop.example.org"])

    def test_bad_domain(self):
        response = self.client.patch(BUSINESS_URL, {"allowed_domains": ["not a domain!"]}, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("allowed_domains", response.json())

    def test_api_key_not_editable(self):
        old_key = self.business.api_key
        self.client.patch(BUSINESS_URL, {"api_key": "ak_hacked"}, format="json")
        self.business.refresh_from_db()
        self.assertEqual(self.business.api_key, old_key)

    def test_other_owner_cannot_access(self):
        other = make_business(email="other@example.com", name="Other Co", slug="other-co")
        self.client.force_authenticate(other.owner)
        self.assertEqual(self.client.get(BUSINESS_URL).json()["name"], "Other Co")
        self.client.patch(BUSINESS_URL, {"name": "Taken over"}, format="json")
        self.business.refresh_from_db()
        other.refresh_from_db()
        self.assertEqual(self.business.name, "Brew Haven")
        self.assertEqual(other.name, "Taken over")

    def test_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(BUSINESS_URL).status_code, 401)
