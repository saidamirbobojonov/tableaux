from decimal import Decimal
from django.db.models import Sum, Count, F, Avg, Q
from django.db.models.functions import TruncDate, ExtractHour
from django.utils import timezone as tz
from datetime import timedelta
from apps.orders.models import Order, OrderStatus, OrderItem, PaymentMethod


class AnalyticsService:
    def __init__(self, branch_id, date_from=None, date_to=None):
        self.branch_id = branch_id
        self.date_from = date_from
        self.date_to = date_to

    def _get_base_queryset(self):
        """Completed / paid orders for this branch in the date window."""
        qs = Order.objects.filter(
            branch_id=self.branch_id,
            status__in=[
                OrderStatus.COMPLETED, OrderStatus.DELIVERED,
                OrderStatus.PAID, OrderStatus.READY,
            ]
        )
        if self.date_from:
            qs = qs.filter(created_at__date__gte=self.date_from)
        if self.date_to:
            qs = qs.filter(created_at__date__lte=self.date_to)
        return qs

    # ─── KPI ────────────────────────────────────────────────────────────────────
    def get_kpi(self):
        qs = self._get_base_queryset()
        data = qs.aggregate(
            total_revenue=Sum("total_amount"),
            total_orders=Count("id"),
            avg_ticket=Avg("total_amount"),
            total_tips=Sum("tip_amount"),
            total_discounts=Sum("discount_amount"),
        )
        return {
            "revenue": float(data["total_revenue"] or 0),
            "orders_count": data["total_orders"] or 0,
            "avg_ticket": float(round(data["avg_ticket"] or 0, 2)),
            "tips_total": float(data["total_tips"] or 0),
            "discounts_total": float(data["total_discounts"] or 0),
        }

    # ─── Top Items ───────────────────────────────────────────────────────────────
    def get_top_items(self, limit=8):
        qs = OrderItem.objects.filter(
            order__branch_id=self.branch_id,
            order__status__in=[OrderStatus.COMPLETED, OrderStatus.DELIVERED],
        )
        if self.date_from:
            qs = qs.filter(order__created_at__date__gte=self.date_from)
        if self.date_to:
            qs = qs.filter(order__created_at__date__lte=self.date_to)

        return list(
            qs.values("menu_item__name")
            .annotate(total_qty=Sum("quantity"), total_money=Sum("total_price"))
            .order_by("-total_qty")[:limit]
        )

    # ─── Daily Trend ─────────────────────────────────────────────────────────────
    def get_daily_trend(self, days=14):
        """Revenue & order count per day for the last N days (or date window)."""
        if self.date_from or self.date_to:
            qs = self._get_base_queryset()
        else:
            since = tz.now().date() - timedelta(days=days - 1)
            qs = Order.objects.filter(
                branch_id=self.branch_id,
                created_at__date__gte=since,
                status__in=[
                    OrderStatus.COMPLETED, OrderStatus.DELIVERED,
                    OrderStatus.PAID, OrderStatus.READY,
                ],
            )

        rows = (
            qs.annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(revenue=Sum("total_amount"), orders=Count("id"))
            .order_by("day")
        )
        return [
            {
                "day": str(r["day"]),
                "revenue": float(r["revenue"] or 0),
                "orders": r["orders"],
            }
            for r in rows
        ]

    # ─── Hourly Distribution ─────────────────────────────────────────────────────
    def get_hourly_distribution(self):
        """Order count by hour-of-day (0-23) — shows peak hours."""
        qs = self._get_base_queryset()
        rows = (
            qs.annotate(hour=ExtractHour("created_at"))
            .values("hour")
            .annotate(orders=Count("id"), revenue=Sum("total_amount"))
            .order_by("hour")
        )
        # Build a full 0-23 array so the chart has no gaps
        by_hour = {r["hour"]: r for r in rows}
        return [
            {
                "hour": h,
                "orders": by_hour.get(h, {}).get("orders", 0),
                "revenue": float(by_hour.get(h, {}).get("revenue") or 0),
            }
            for h in range(24)
        ]

    # ─── Payment Split ────────────────────────────────────────────────────────────
    def get_payment_split(self):
        """Revenue and order count per payment method."""
        qs = self._get_base_queryset().filter(payment_method__isnull=False)
        rows = (
            qs.values("payment_method")
            .annotate(orders=Count("id"), revenue=Sum("total_amount"))
            .order_by("-revenue")
        )
        label_map = {
            PaymentMethod.CASH: "Cash",
            PaymentMethod.CARD: "Card",
            PaymentMethod.QR_ONLINE: "QR Online",
        }
        return [
            {
                "method": r["payment_method"],
                "label": label_map.get(r["payment_method"], r["payment_method"]),
                "orders": r["orders"],
                "revenue": float(r["revenue"] or 0),
            }
            for r in rows
        ]

    # ─── Category Breakdown ───────────────────────────────────────────────────────
    def get_category_breakdown(self):
        """Revenue and qty sold per menu category."""
        qs = OrderItem.objects.filter(
            order__branch_id=self.branch_id,
            order__status__in=[OrderStatus.COMPLETED, OrderStatus.DELIVERED],
        )
        if self.date_from:
            qs = qs.filter(order__created_at__date__gte=self.date_from)
        if self.date_to:
            qs = qs.filter(order__created_at__date__lte=self.date_to)

        rows = (
            qs.values("menu_item__category__name")
            .annotate(revenue=Sum("total_price"), qty=Sum("quantity"))
            .order_by("-revenue")
        )
        return [
            {
                "category": r["menu_item__category__name"] or "Uncategorised",
                "revenue": float(r["revenue"] or 0),
                "qty": r["qty"] or 0,
            }
            for r in rows
        ]

    # ─── Waiter / Staff Performance ───────────────────────────────────────────────
    def get_waiter_stats(self):
        """Orders, revenue and avg ticket per waiter (staff who created the order)."""
        qs = self._get_base_queryset().filter(created_by__isnull=False)
        rows = (
            qs.values(
                "created_by__id",
                "created_by__first_name",
                "created_by__last_name",
                "created_by__email",
            )
            .annotate(
                orders=Count("id"),
                revenue=Sum("total_amount"),
                avg_ticket=Avg("total_amount"),
                tips=Sum("tip_amount"),
            )
            .order_by("-revenue")[:10]
        )
        result = []
        for r in rows:
            first = r["created_by__first_name"] or ""
            last = r["created_by__last_name"] or ""
            name = f"{first} {last}".strip() or r["created_by__email"]
            result.append(
                {
                    "name": name,
                    "orders": r["orders"],
                    "revenue": float(r["revenue"] or 0),
                    "avg_ticket": float(round(r["avg_ticket"] or 0, 2)),
                    "tips": float(r["tips"] or 0),
                }
            )
        return result

    # ─── Food Cost Analysis ───────────────────────────────────────────────────────
    def get_food_cost_analysis(self):
        """Total food cost vs revenue for completed orders (uses cost_price snapshot)."""
        qs = OrderItem.objects.filter(
            order__branch_id=self.branch_id,
            order__status__in=[OrderStatus.COMPLETED, OrderStatus.DELIVERED],
        )
        if self.date_from:
            qs = qs.filter(order__created_at__date__gte=self.date_from)
        if self.date_to:
            qs = qs.filter(order__created_at__date__lte=self.date_to)

        data = qs.aggregate(
            total_revenue=Sum("total_price"),
            total_cost=Sum(F("cost_price") * F("quantity")),
        )
        revenue = Decimal(str(data["total_revenue"] or 0))
        cost = Decimal(str(data["total_cost"] or 0))
        gross_profit = revenue - cost
        margin_pct = float((gross_profit / revenue * 100).quantize(Decimal("0.1"))) if revenue > 0 else 0
        return {
            "total_revenue": float(revenue),
            "total_food_cost": float(cost),
            "gross_profit": float(gross_profit),
            "margin_percent": margin_pct,
        }

    # ─── Order Type Split ─────────────────────────────────────────────────────────
    def get_order_type_split(self):
        """DINE_IN / TAKEAWAY / DELIVERY breakdown."""
        qs = self._get_base_queryset()
        rows = (
            qs.values("order_type")
            .annotate(orders=Count("id"), revenue=Sum("total_amount"))
            .order_by("-orders")
        )
        return [
            {
                "type": r["order_type"],
                "orders": r["orders"],
                "revenue": float(r["revenue"] or 0),
            }
            for r in rows
        ]
