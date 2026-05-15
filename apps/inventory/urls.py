from django.urls import path
from .views import (
    IngredientListCreateView, IngredientDetailView,
    SupplierListCreateView, SupplierDetailView,
    StockBalanceListView,
    PurchaseOrderListCreateView, PurchaseOrderDetailView, PurchaseOrderReceiveView,
)

urlpatterns = [
    path("ingredients/", IngredientListCreateView.as_view(), name="ingredient-list"),
    path("ingredients/<uuid:pk>/", IngredientDetailView.as_view(), name="ingredient-detail"),
    path("suppliers/", SupplierListCreateView.as_view(), name="supplier-list"),
    path("suppliers/<uuid:pk>/", SupplierDetailView.as_view(), name="supplier-detail"),
    path("stock/", StockBalanceListView.as_view(), name="stock-balance-list"),
    path("purchase-orders/", PurchaseOrderListCreateView.as_view(), name="po-list"),
    path("purchase-orders/<uuid:pk>/", PurchaseOrderDetailView.as_view(), name="po-detail"),
    path("purchase-orders/<uuid:pk>/receive/", PurchaseOrderReceiveView.as_view(), name="po-receive"),
]
