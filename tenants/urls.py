from django.urls import path

from .views import BusinessSettingsView, WidgetConfigView

urlpatterns = [
    path("public/widget-config/", WidgetConfigView.as_view(), name="widget-config"),
    path("business/", BusinessSettingsView.as_view(), name="business-settings"),
]
