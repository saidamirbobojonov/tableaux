from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils.dateparse import parse_date
from .services import AnalyticsService
from apps.users.permissions import IsOwnerOrFinance, check_branch_access

from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes


class DashboardStatsView(APIView):
    """
    GET /api/v1/analytics/dashboard/
    Full manager dashboard — KPI, trends, breakdowns.
    """
    permission_classes = [IsOwnerOrFinance]

    @extend_schema(
        summary="Manager Dashboard Stats",
        description=(
            "Returns KPI, top items, daily trend, hourly distribution, "
            "payment split, category breakdown, waiter stats, food cost analysis."
        ),
        parameters=[
            OpenApiParameter("branch_id", OpenApiTypes.UUID, OpenApiParameter.QUERY, required=True),
            OpenApiParameter("from", OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
            OpenApiParameter("to", OpenApiTypes.DATE, OpenApiParameter.QUERY, required=False),
        ],
    )
    def get(self, request):
        branch_id = request.query_params.get("branch_id")
        date_from_str = request.query_params.get("from")
        date_to_str = request.query_params.get("to")

        if not branch_id:
            return Response({"error": "branch_id is required"}, status=400)

        if not check_branch_access(request.user, branch_id):
            return Response({"error": "You do not have access to this branch."}, status=403)

        date_from = parse_date(date_from_str) if date_from_str else None
        date_to = parse_date(date_to_str) if date_to_str else None

        if date_from_str and not date_from:
            return Response({"error": "Invalid 'from' date. Use YYYY-MM-DD."}, status=400)
        if date_to_str and not date_to:
            return Response({"error": "Invalid 'to' date. Use YYYY-MM-DD."}, status=400)
        if date_from and date_to and date_from > date_to:
            return Response({"error": "'from' date cannot be after 'to' date."}, status=400)

        svc = AnalyticsService(branch_id, date_from, date_to)

        return Response({
            "kpi": svc.get_kpi(),
            "top_items": svc.get_top_items(),
            "daily_trend": svc.get_daily_trend(),
            "hourly_distribution": svc.get_hourly_distribution(),
            "payment_split": svc.get_payment_split(),
            "category_breakdown": svc.get_category_breakdown(),
            "waiter_stats": svc.get_waiter_stats(),
            "food_cost": svc.get_food_cost_analysis(),
            "order_type_split": svc.get_order_type_split(),
        })
