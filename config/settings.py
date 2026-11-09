"""
Django settings for the AskDesk project.
Secrets and environment-specific values are loaded from the .env file.
"""

from datetime import timedelta
from pathlib import Path

from corsheaders.defaults import default_headers
from decouple import Csv
from decouple import config as env

BASE_DIR = Path(__file__).resolve().parent.parent


# Security
SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG", default=False, cast=bool)
ALLOWED_HOSTS = env("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())


# Applications
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
]

LOCAL_APPS = [
    "accounts",
    "tenants",
    "documents",
    "chat",
    "tickets",
    "analytics",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

AUTH_USER_MODEL = "accounts.User"


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database: PostgreSQL (required for pgvector)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
    }
}


# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True


# Static and media files (uploaded PDFs go to MEDIA_ROOT)
STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]
MEDIA_URL = "media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Django REST Framework and API docs (Swagger UI at /api/docs/)
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    # Every API needs a logged-in user unless a view says otherwise (like the ask endpoints)
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    # Per-visitor limits for the public endpoints (stored in the Redis cache)
    "DEFAULT_THROTTLE_RATES": {
        "ask": "30/minute",
        "ticket": "5/hour",
        "widget": "60/minute",
    },
}

# CORS: the embeddable widget may call the public endpoints from any website
# (per-business allowed_domains are checked in the views). Nothing else is exposed.
CORS_ALLOW_ALL_ORIGINS = True
CORS_URLS_REGEX = r"^/api/(chat/ask/|public/)"
CORS_ALLOW_HEADERS = (*default_headers, "x-api-key")

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

SPECTACULAR_SETTINGS = {
    "TITLE": "AskDesk API",
    "DESCRIPTION": "AI customer support platform powered by RAG",
    "VERSION": "1.0.0",
    "COMPONENT_SPLIT_REQUEST": True,  # shows a file picker for uploads in Swagger
}


# OpenAI / RAG settings
OPENAI_API_KEY = env("OPENAI_API_KEY")
CHAT_MODEL = env("CHAT_MODEL")
EMBEDDING_MODEL = env("EMBEDDING_MODEL", default="text-embedding-3-small")
EMBEDDING_DIMENSIONS = env("EMBEDDING_DIMENSIONS", default=1536, cast=int)
RETRIEVAL_MAX_DISTANCE = env("RETRIEVAL_MAX_DISTANCE", default=0.70, cast=float)


# Redis, Celery, and cache
REDIS_URL = env("REDIS_URL", default="redis://127.0.0.1:6379")

CELERY_BROKER_URL = f"{REDIS_URL}/0"
CELERY_TASK_IGNORE_RESULT = True          # status is tracked on the Document model instead
CELERY_TASK_ACKS_LATE = True              # a task is re-queued if the worker crashes mid-task
CELERY_WORKER_PREFETCH_MULTIPLIER = 1     # take one task at a time
CELERY_TASK_TIME_LIMIT = 600              # kill a task that runs longer than 10 minutes

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": f"{REDIS_URL}/1",
    }
}


# Email (prints to the terminal in development; set real SMTP settings in production)
EMAIL_BACKEND = env("EMAIL_BACKEND", default="django.core.mail.backends.console.EmailBackend")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="AskDesk <noreply@askdesk.local>")