from django.contrib import admin

from .models import Business


@admin.register(Business)
class BusinessAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "owner", "is_active", "created_at"]
    prepopulated_fields = {"slug": ["name"]}
    readonly_fields = ["api_key"]