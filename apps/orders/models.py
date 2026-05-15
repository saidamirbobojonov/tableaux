from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import BaseModel, SoftDeleteMixin
from apps.users.models import Branch, User
from apps.catalog.models import MenuItem, MenuItemVariant, Modifier
from apps.inventory.models import StockMovement, StockMovementType, StockBalance, UnitType


# --- ENUMS ---
class OrderType(models.TextChoices):
    DINE_IN = "DINE_IN", _("Dine In")
    TAKEAWAY = "TAKEAWAY", _("Takeaway")
    DELIVERY = "DELIVERY", _("Delivery")
    RESERVE = "RESERVE", _("Reservation")


class OrderStatus(models.TextChoices):
    PENDING = "PENDING", _("Pending")  # Создан
    PAID = "PAID", _("Paid")  # Оплачен
    PREPARING = "PREPARING", _("Preparing")  # Готовится
    READY = "READY", _("Ready / Waiting Courier")  # Готов (ждет курьера или официанта)

    # --- Delivery Specific ---
    OUT_FOR_DELIVERY = "ON_WAY", _("Out for Delivery")  # Курьер забрал
    DELIVERED = "DELIVERED", _("Delivered")  # Курьер отдал (Финал для доставки)

    COMPLETED = "COMPLETED", _("Completed")  # Финал для Dine-in
    CANCELLED = "CANCELLED", _("Cancelled")


class PaymentMethod(models.TextChoices):
    CASH = "CASH", _("Cash")
    CARD = "CARD", _("Card")
    QR_ONLINE = "QR", _("QR Online")


# --- MODELS ---
class Order(BaseModel, SoftDeleteMixin):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="orders")

    # Тип заказа
    order_type = models.CharField(
        max_length=20,
        choices=OrderType.choices,
        default=OrderType.DINE_IN
    )

    # Логистика
    table = models.ForeignKey(
        "users.Table", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="orders"
    )
    table_number = models.CharField(max_length=10, blank=True, null=True)  # fallback / QR orders
    delivery_address = models.TextField(blank=True, null=True)  # Only for Delivery
    customer_phone = models.CharField(max_length=20, blank=True, null=True)  # Contact info

    status = models.CharField(max_length=20, choices=OrderStatus.choices, default=OrderStatus.PENDING)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, blank=True, null=True)
    shift = models.ForeignKey(
        "shifts.WorkShift",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="orders"
    )

    # Кто принял заказ (официант/кассир)
    created_by = models.ForeignKey(
        "users.User", on_delete=models.SET_NULL,
        null=True, blank=True, related_name="created_orders"
    )

    # Финансы
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tip_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Tip / gratuity")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0, help_text="Discount applied")

    # Технические поля
    is_inventory_deducted = models.BooleanField(default=False)
    notes = models.TextField(blank=True)

    def calculate_total(self):
        """Пересчитывает сумму: (Блюда + Модификаторы) × Кол-во + Доставка + Чаевые - Скидка"""
        items_total = Decimal("0")
        for item in self.items.prefetch_related("selected_modifiers").all():
            modifier_sum = sum(m.price for m in item.selected_modifiers.all())
            line_total = (item.price + modifier_sum) * item.quantity
            if item.total_price != line_total:
                OrderItem.objects.filter(pk=item.pk).update(total_price=line_total)
            items_total += line_total
        tip = self.tip_amount or Decimal("0")
        discount = self.discount_amount or Decimal("0")
        self.total_amount = items_total + self.delivery_fee + tip - discount
        self.save(update_fields=["total_amount"])

    def complete_order(self):
        """
        Списание со склада.
        Обычно происходит, когда еда готова (READY) или уехала (OUT_FOR_DELIVERY).
        Raises ValueError если не хватает остатков на складе.
        """
        from django.db import transaction

        with transaction.atomic():
            # Lock this order row to prevent double-completion under concurrent requests
            locked = Order.objects.select_for_update().get(pk=self.pk)
            if locked.is_inventory_deducted:
                return

            # --- Pre-flight: рассчитываем все необходимые списания ---
            deductions = []
            for order_item in locked.items.all():
                for recipe_part in order_item.menu_item.recipe_items.all():
                    qty_to_deduct = recipe_part.quantity * order_item.quantity
                    final_qty = qty_to_deduct
                    if recipe_part.unit in [UnitType.GRAM, UnitType.MILLILITER] and \
                            recipe_part.ingredient.storage_unit in [UnitType.KG, UnitType.LITER]:
                        final_qty = qty_to_deduct / Decimal("1000")
                    deductions.append((recipe_part.ingredient, final_qty))

            # --- Блокируем строки склада (select_for_update) и проверяем остатки ---
            ingredient_ids = [ing.id for ing, _ in deductions]
            locked_balances = {
                b.ingredient_id: b
                for b in StockBalance.objects.select_for_update().filter(
                    branch=locked.branch, ingredient_id__in=ingredient_ids
                )
            }

            for ingredient, qty in deductions:
                balance = locked_balances.get(ingredient.id)
                current = balance.quantity if balance else 0
                if current < qty:
                    raise ValueError(
                        f"Insufficient stock: '{ingredient.name}' "
                        f"(need {qty}, have {current})"
                    )

            # --- Всё ок — применяем списания ---
            for ingredient, final_qty in deductions:
                StockMovement.objects.create(
                    branch=locked.branch,
                    ingredient=ingredient,
                    type=StockMovementType.OUT_SALE,
                    quantity=-final_qty,
                    cost_at_time=ingredient.current_cost,
                    notes=f"Order #{str(locked.id)[:8]} ({locked.order_type})"
                )
                balance = locked_balances.get(ingredient.id)
                if balance:
                    balance.quantity -= final_qty
                    balance.save()
                # No else — missing balance already caught in pre-flight check above

            locked.is_inventory_deducted = True

            if locked.order_type == OrderType.DELIVERY:
                locked.status = OrderStatus.DELIVERED
            else:
                locked.status = OrderStatus.COMPLETED

            locked.save()
            # Sync in-memory instance to reflect saved state
            self.is_inventory_deducted = locked.is_inventory_deducted
            self.status = locked.status

    def __str__(self):
        return f"Order #{str(self.id)[:8]} [{self.order_type}] - {self.total_amount}"


class OrderItem(BaseModel):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.PROTECT)
    variant = models.ForeignKey(MenuItemVariant, on_delete=models.SET_NULL, null=True, blank=True)

    quantity = models.PositiveIntegerField(default=1)
    selected_modifiers = models.ManyToManyField(Modifier, blank=True, related_name="order_items")

    # SNAPSHOTS
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    total_price = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    notes = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        if not self.price:
            if self.variant and self.variant.price_override:
                self.price = self.variant.price_override
            else:
                self.price = self.menu_item.base_price

        if not self.cost_price:
            self.cost_price = self.menu_item.calculate_food_cost()

        self.total_price = self.price * self.quantity
        super().save(*args, **kwargs)
        self.order.calculate_total()