from rest_framework import generics, views, status
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Ingredient, Supplier, StockBalance, PurchaseOrder
from .serializers import (
    IngredientSerializer, SupplierSerializer,
    StockBalanceSerializer, PurchaseOrderSerializer
)
from apps.users.permissions import IsOwnerOrManager, IsStaff, check_branch_access, check_org_access


class IngredientListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/inventory/ingredients/?organization_id=...
    POST /api/v1/inventory/ingredients/
    """
    serializer_class = IngredientSerializer
    permission_classes = [IsOwnerOrManager]

    def get_queryset(self):
        org_id = self.request.query_params.get("organization_id")
        if not org_id:
            raise ValidationError({"organization_id": "This parameter is required."})
        if not check_org_access(self.request.user, org_id):
            raise PermissionDenied("You do not have access to this organization.")
        return Ingredient.objects.filter(is_deleted=False, organization_id=org_id).order_by("name")


class IngredientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/v1/inventory/ingredients/<uuid:pk>/
    """
    queryset = Ingredient.objects.filter(is_deleted=False)
    serializer_class = IngredientSerializer
    permission_classes = [IsOwnerOrManager]
    lookup_field = "pk"


class SupplierListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/inventory/suppliers/?organization_id=...
    POST /api/v1/inventory/suppliers/
    """
    serializer_class = SupplierSerializer
    permission_classes = [IsOwnerOrManager]

    def get_queryset(self):
        org_id = self.request.query_params.get("organization_id")
        if not org_id:
            raise ValidationError({"organization_id": "This parameter is required."})
        if not check_org_access(self.request.user, org_id):
            raise PermissionDenied("You do not have access to this organization.")
        return Supplier.objects.filter(is_deleted=False, organization_id=org_id).order_by("name")


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PATCH/DELETE /api/v1/inventory/suppliers/<uuid:pk>/
    """
    queryset = Supplier.objects.filter(is_deleted=False)
    serializer_class = SupplierSerializer
    permission_classes = [IsOwnerOrManager]
    lookup_field = "pk"


class StockBalanceListView(generics.ListAPIView):
    """
    GET /api/v1/inventory/stock/?branch_id=...
    Returns current stock levels. Optionally filter by low stock: ?low_stock=1
    """
    serializer_class = StockBalanceSerializer
    permission_classes = [IsStaff]

    def get_queryset(self):
        branch_id = self.request.query_params.get("branch_id")
        if not branch_id:
            raise ValidationError({"branch_id": "This parameter is required."})
        if not check_branch_access(self.request.user, branch_id):
            raise PermissionDenied("You do not have access to this branch.")

        qs = StockBalance.objects.select_related("ingredient").filter(branch_id=branch_id)
        if self.request.query_params.get("low_stock"):
            from django.db.models import F
            qs = qs.filter(quantity__lte=F("ingredient__min_stock_level"))
        return qs.order_by("ingredient__name")


class PurchaseOrderListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/inventory/purchase-orders/?branch_id=...
    POST /api/v1/inventory/purchase-orders/
    """
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsOwnerOrManager]

    def get_queryset(self):
        branch_id = self.request.query_params.get("branch_id")
        if not branch_id:
            raise ValidationError({"branch_id": "This parameter is required."})
        if not check_branch_access(self.request.user, branch_id):
            raise PermissionDenied("You do not have access to this branch.")
        return PurchaseOrder.objects.filter(
            is_deleted=False, branch_id=branch_id
        ).prefetch_related("items").order_by("-created_at")


class PurchaseOrderDetailView(generics.RetrieveAPIView):
    """
    GET /api/v1/inventory/purchase-orders/<uuid:pk>/
    """
    queryset = PurchaseOrder.objects.filter(is_deleted=False).prefetch_related("items")
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsOwnerOrManager]
    lookup_field = "pk"


class PurchaseOrderReceiveView(views.APIView):
    """
    POST /api/v1/inventory/purchase-orders/<uuid:pk>/receive/
    Marks PO as received and updates stock balances + ingredient costs.
    """
    permission_classes = [IsOwnerOrManager]

    def post(self, request, pk):
        po = get_object_or_404(PurchaseOrder, pk=pk, is_deleted=False)

        if not check_branch_access(request.user, str(po.branch_id)):
            raise PermissionDenied("You do not have access to this branch.")

        if po.status == PurchaseOrder.Status.CANCELLED:
            return Response({"error": "Cannot receive a cancelled order."}, status=status.HTTP_400_BAD_REQUEST)

        # Status RECEIVED check is now handled inside receive_order() with select_for_update
        po.receive_order()
        return Response({"status": "received", "total_amount": po.total_amount})
