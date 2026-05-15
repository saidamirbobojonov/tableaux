import logging

from rest_framework import generics, views, status
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.orders.models import Order, OrderStatus
from .serializers import KDSOrderSerializer
from apps.users.models import Branch
from apps.users.permissions import IsKitchenStaff, check_branch_access

logger = logging.getLogger(__name__)


class KDSBoardView(generics.ListAPIView):
    """
    GET /api/v1/kitchen/board/?branch_id=...
    Returns active orders for the Kitchen Display.
    Excludes COMPLETED/CANCELLED orders to keep the board clean.
    """
    serializer_class = KDSOrderSerializer
    permission_classes = [IsKitchenStaff]

    def get_queryset(self):
        branch_id = self.request.query_params.get('branch_id')
        if not branch_id:
            raise ValidationError({"branch_id": "This parameter is required."})

        if not check_branch_access(self.request.user, branch_id):
            raise PermissionDenied("You do not have access to this branch.")

        return Order.objects.filter(
            branch_id=branch_id,
            status__in=[OrderStatus.PENDING, OrderStatus.PREPARING, OrderStatus.READY]
        ).select_related("created_by").prefetch_related(
            "items__menu_item",
            "items__variant",
            "items__selected_modifiers",
        ).order_by('created_at')


class KDSStatusUpdateView(views.APIView):
    """
    POST /api/v1/kitchen/orders/{id}/status/
    Body: { "status": "PREPARING" } or "READY" or "COMPLETED"
    """
    permission_classes = [IsKitchenStaff]

    # Valid KDS transitions. READY → COMPLETED triggers complete_order(),
    # which auto-sets DELIVERED for delivery orders or COMPLETED for dine-in/takeaway.
    VALID_TRANSITIONS = {
        OrderStatus.PENDING:   [OrderStatus.PREPARING, OrderStatus.CANCELLED],
        OrderStatus.PREPARING: [OrderStatus.READY, OrderStatus.CANCELLED],
        # READY → payment handled by POS, not KDS
    }

    @extend_schema(request=None, responses=KDSOrderSerializer)
    def post(self, request, pk):
        from django.db import transaction
        from apps.users.models import Table, TableStatus

        new_status = request.data.get("status")

        # Quick unprotected fetch just to check branch access (cheap)
        order = get_object_or_404(Order, pk=pk)
        if not check_branch_access(request.user, str(order.branch_id)):
            raise PermissionDenied("You do not have access to this branch.")

        error_response = None
        with transaction.atomic():
            # Lock the row for the duration of the entire transition
            order = Order.objects.select_for_update().get(pk=pk)

            allowed_next = self.VALID_TRANSITIONS.get(order.status, [])

            if not allowed_next:
                if order.status in (OrderStatus.COMPLETED, OrderStatus.DELIVERED, OrderStatus.CANCELLED):
                    msg = f"Order is already in a terminal state: {order.status}."
                else:
                    msg = f"Order status '{order.status}' cannot be updated from the kitchen screen."
                error_response = Response({"error": msg}, status=400)
            elif new_status not in allowed_next:
                error_response = Response(
                    {"error": f"Invalid transition: {order.status} → {new_status}. Allowed: {allowed_next}"},
                    status=400
                )
            elif new_status == OrderStatus.CANCELLED:
                order.status = OrderStatus.CANCELLED
                order.save(update_fields=["status"])
                # Free up the table if one was assigned
                if order.table_id:
                    Table.objects.filter(pk=order.table_id).update(status=TableStatus.AVAILABLE)
            elif new_status == OrderStatus.COMPLETED:
                try:
                    order.complete_order()  # Has its own savepoint; safe inside atomic
                except ValueError as e:
                    error_response = Response({"error": str(e)}, status=400)
            else:
                order.status = new_status
                order.save()

        if error_response:
            return error_response

        logger.info(
            "KDS status update: order=%s branch=%s →%s user=%s",
            str(order.id)[:8], order.branch_id, order.status, request.user
        )
        return Response({"status": "updated", "current_status": order.status})