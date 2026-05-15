from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path("admin/", admin.site.urls),

    # --- PUBLIC ---
    path("api/v1/auth/", include("apps.users.urls")),           # /token/ /token/refresh/ /branches/<id>/
    path("api/v1/catalog/", include("apps.catalog.urls")),      # /branches/<id>/menu/
    path("api/v1/qr/", include("apps.qr.urls")),                # /<token>/
    path("api/v1/orders/", include("apps.orders.urls")),        # POST (public create) + GET (staff list)

    # --- STAFF (protected by RBAC) ---
    path("api/v1/kitchen/", include("apps.kitchen.urls")),      # /board/ /orders/<id>/status/
    path("api/v1/shifts/", include("apps.shifts.urls")),        # /action/
    path("api/v1/inventory/", include("apps.inventory.urls")), # /ingredients/ /stock/ /purchase-orders/
    path("api/v1/analytics/", include("apps.analytics.urls")), # /dashboard/

    # --- API DOCS ---
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

from django.conf import settings

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    import debug_toolbar
    urlpatterns = [
        path("__debug__/", include(debug_toolbar.urls)),
    ] + urlpatterns