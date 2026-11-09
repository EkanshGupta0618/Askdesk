from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from tenants.models import Business

User = get_user_model()


def unique_slug(name):
    base = slugify(name)[:40] or "business"
    slug, number = base, 2
    while Business.objects.filter(slug=slug).exists():
        slug = f"{base}-{number}"
        number += 1
    return slug


class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    business_name = serializers.CharField(max_length=255)

    def validate_email(self, value):
        value = value.lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        validate_password(value)  # uses AUTH_PASSWORD_VALIDATORS from settings
        return value

    @transaction.atomic
    def create(self, validated_data):
        # The email doubles as the username, so login works by email
        user = User.objects.create_user(
            username=validated_data["email"],
            email=validated_data["email"],
            password=validated_data["password"],
        )
        Business.objects.create(
            name=validated_data["business_name"],
            slug=unique_slug(validated_data["business_name"]),
            owner=user,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class BusinessSerializer(serializers.ModelSerializer):
    class Meta:
        model = Business
        fields = [
            "id", "name", "slug", "api_key", "created_at",
            "widget_greeting", "widget_color", "allowed_domains",
        ]
        read_only_fields = fields


class MeSerializer(serializers.ModelSerializer):
    business = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "business"]

    @extend_schema_field(BusinessSerializer(allow_null=True))
    def get_business(self, user):
        business = user.businesses.filter(is_active=True).first()
        return BusinessSerializer(business).data if business else None


class TokenResponseSerializer(serializers.Serializer):
    """What register and login return (used for the API docs)."""

    access = serializers.CharField()
    refresh = serializers.CharField()
    user = MeSerializer()   