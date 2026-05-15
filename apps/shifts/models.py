from decimal import Decimal

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from apps.core.models import BaseModel
from apps.users.models import Branch, User


class WorkShift(BaseModel):
    class Status(models.TextChoices):
        OPEN = "OPEN", _("Open")
        CLOSED = "CLOSED", _("Closed")

    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="shifts")

    # Кто открыл / закрыл
    opened_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="opened_shifts")
    closed_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="closed_shifts", null=True, blank=True)

    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)

    # ДЕНЬГИ
    opening_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # Разменка утром

    # Эти поля заполняются при закрытии
    expected_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # Сколько должно быть (по системе)
    actual_cash = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # Сколько насчитали руками

    difference = models.DecimalField(max_digits=12, decimal_places=2, default=0)  # actual - expected

    notes = models.TextField(blank=True)

    def close_shift(self, user, counted_cash):
        """Закрытие смены и подсчет итогов"""
        from django.db import transaction
        from apps.orders.models import Order, PaymentMethod, OrderStatus

        with transaction.atomic():
            # Lock the row so concurrent close attempts are serialized
            locked = WorkShift.objects.select_for_update().get(pk=self.pk)
            if locked.status == self.Status.CLOSED:
                raise ValueError("Shift is already closed.")

            locked.closed_by = user
            locked.ended_at = timezone.now()

            # Используем str(), чтобы избежать проблем с точностью float
            locked.actual_cash = Decimal(str(counted_cash))

            # Считаем, сколько должно быть денег (только НАЛИЧНЫЕ)
            cash_revenue = Order.objects.filter(
                branch=locked.branch,
                created_at__gte=locked.started_at,
                created_at__lte=locked.ended_at,
                payment_method=PaymentMethod.CASH,
                status__in=[OrderStatus.COMPLETED, OrderStatus.PAID, OrderStatus.DELIVERED]
            ).aggregate(total=models.Sum('total_amount'))['total'] or Decimal('0.00')

            locked.expected_cash = locked.opening_cash + cash_revenue
            locked.difference = locked.actual_cash - locked.expected_cash
            locked.status = self.Status.CLOSED
            locked.save()

        # Sync in-memory instance
        self.status = locked.status
        self.ended_at = locked.ended_at
        self.actual_cash = locked.actual_cash
        self.expected_cash = locked.expected_cash
        self.difference = locked.difference

    def __str__(self):
        return f"{self.branch.name} Shift #{str(self.id)[:8]} ({self.status})"