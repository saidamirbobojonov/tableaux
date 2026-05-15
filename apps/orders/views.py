from django.utils.dateparse import parse_date
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes
from .models import Order
from .serializers import OrderCreateSerializer, OrderManageSerializer, OrderPaySerializer
from apps.users.permissions import IsStaff, IsCashier, check_branch_access


class OrderListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/orders/  — Staff: list orders with filters
    POST /api/v1/orders/  — Public: create a new order (guest checkout via QR)
    """

    def get_serializer_class(self):
        if self.request.method == "POST":
            return OrderCreateSerializer
        return OrderManageSerializer

    def get_permissions(self):
        if self.request.method == "POST":
            return []  # Public — guest checkout
        return [IsStaff()]

    def get_queryset(self):
        branch_id = self.request.query_params.get("branch_id")
        if not branch_id:
            raise ValidationError({"branch_id": "This parameter is required."})
        if not check_branch_access(self.request.user, branch_id):
            raise PermissionDenied("You do not have access to this branch.")

        queryset = Order.objects.filter(
            is_deleted=False, branch_id=branch_id
        ).select_related("created_by").prefetch_related(
            "items__selected_modifiers", "items__menu_item", "items__variant"
        ).order_by("-created_at")

        status_param = self.request.query_params.get("status")
        if status_param:
            from .models import OrderStatus
            valid_values = {s.value for s in OrderStatus}
            requested = [s.strip() for s in status_param.split(",") if s.strip()]
            invalid = [s for s in requested if s not in valid_values]
            if invalid:
                raise ValidationError({"status": f"Invalid status values: {invalid}"})
            queryset = queryset.filter(status__in=requested)

        from_date_str = self.request.query_params.get("from_date")
        to_date_str = self.request.query_params.get("to_date")

        from_date = parse_date(from_date_str) if from_date_str else None
        to_date = parse_date(to_date_str) if to_date_str else None

        if from_date_str and not from_date:
            raise ValidationError({"from_date": "Invalid date format. Use YYYY-MM-DD."})
        if to_date_str and not to_date:
            raise ValidationError({"to_date": "Invalid date format. Use YYYY-MM-DD."})
        if from_date and to_date and from_date > to_date:
            raise ValidationError({"date_range": "from_date cannot be after to_date."})

        if from_date:
            queryset = queryset.filter(created_at__date__gte=from_date)
        if to_date:
            queryset = queryset.filter(created_at__date__lte=to_date)

        return queryset

    @extend_schema(
        parameters=[
            OpenApiParameter("branch_id", OpenApiTypes.UUID, location=OpenApiParameter.QUERY, required=True),
            OpenApiParameter("status", OpenApiTypes.STR, location=OpenApiParameter.QUERY, description="PAID,READY,..."),
            OpenApiParameter("from_date", OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="Start Date (YYYY-MM-DD)"),
            OpenApiParameter("to_date", OpenApiTypes.DATE, location=OpenApiParameter.QUERY, description="End Date (YYYY-MM-DD)"),
        ]
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class OrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/v1/orders/<uuid:pk>/  — order details
    PATCH  /api/v1/orders/<uuid:pk>/  — update status / payment
    DELETE /api/v1/orders/<uuid:pk>/  — cancel order
    """
    queryset = Order.objects.filter(is_deleted=False).select_related("created_by").prefetch_related(
        "items__selected_modifiers", "items__menu_item", "items__variant"
    )
    serializer_class = OrderManageSerializer
    permission_classes = [IsStaff]
    lookup_field = "pk"

    def get_object(self):
        obj = super().get_object()
        if not check_branch_access(self.request.user, str(obj.branch_id)):
            raise PermissionDenied("You do not have access to this branch.")
        return obj


class OrderPayView(APIView):
    """
    POST /api/v1/orders/<uuid:pk>/pay/
    Body: { payment_method: "CASH" | "CARD" | "QR" }
    Marks order as paid + completed, frees the table.
    """
    permission_classes = [IsCashier]

    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk, is_deleted=False)
        if not check_branch_access(request.user, str(order.branch_id)):
            raise PermissionDenied("You do not have access to this branch.")
        ser = OrderPaySerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            updated = ser.save(order)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(OrderManageSerializer(updated).data)