from .base import *

# 1. DEBUG CONFIG
# ------------------------------------------------------------------------------
DEBUG = False
SECRET_KEY = env("DJANGO_SECRET_KEY", default="django-insecure-dev-key-change-me")
ALLOWED_HOSTS = ["localhost", "0.0.0.0", "127.0.0.1", "192.168.88.209", "10.0.2.2"]

# 2. CORS
# ------------------------------------------------------------------------------
# Разрешаем все, чтобы фронтенд на localhost:3000 не мучился
CORS_ALLOW_ALL_ORIGINS = True

# 3. LOGGING
# ------------------------------------------------------------------------------
# Для локальной разработки удобнее читать обычный текст, а не JSON
LOGGING["handlers"]["console"]["formatter"] = "verbose"

# 4. EMAIL (Console Backend)
# ------------------------------------------------------------------------------
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# 5. DEBUG TOOLBAR (Если нужно)
# ------------------------------------------------------------------------------
try:
    import debug_toolbar
    INSTALLED_APPS += ["debug_toolbar"]
    MIDDLEWARE += ["debug_toolbar.middleware.DebugToolbarMiddleware"]
    INTERNAL_IPS = ["127.0.0.1"]
except ImportError:
    pass