from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from apps.core.models import BaseModel, SoftDeleteMixin
from apps.users.models import Organization, Branch


# --- ENUMS ---
class UnitType(models.TextChoices):
    KG = "KG", _("Kilogram")
    LITER = "L", _("Liter")
    PIECE = "PCS", _("Piece")
    GRAM = "G", _("Gram")
    MILLILITER = "ML", _("Milliliter")


class StockMovementType(models.TextChoices):
    IN_PURCHASE = "IN_PURCHASE", _("Purchase Receipt")  # Приход от поставщика
    OUT_SALE = "OUT_SALE", _("Sale Deduction")  # Списание при продаже
    OUT_WASTE = "OUT_WASTE", _("Waste/Spoilage")  # Списание (порча)
    ADJUSTMENT = "ADJ", _("Inventory Adjustment")  # Инвентаризация
    TRANSFER_IN = "TR_IN", _("Transfer In")  # Перемещение (приход)
    TRANSFER_OUT = "TR_OUT", _("Transfer Out")  # Перемещение (уход)


# --- 1. CORE ITEMS (Ваш существующий класс + min_stock_level) ---
class Ingredient(BaseModel, SoftDeleteMixin):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)

    storage_unit = models.CharField(
        max_length=10,
        choices=UnitType.choices,
        default=UnitType.KG
    )

    current_cost = models.DecimalField(
        max_digits=19,
        decimal_places=4,
        default=0
    )

    # Новое поле: минимальный остаток для уведомлений
    min_stock_level = models.DecimalField(max_digits=10, decimal_places=3, default=0)

    def __str__(self):
        return f"{self.name} ({self.current_cost} TJS / {self.storage_unit})"


# --- 2. SUPPLIERS (Новое) ---
class Supplier(BaseModel, SoftDeleteMixin):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    contact_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    tax_id = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return self.name


# --- 3. STOCK BALANCE (Новое: Остатки на складе) ---
class StockBalance(BaseModel):
    """
    Сколько конкретного ингредиента лежит на конкретном складе (Branch).
    """
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="stocks")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE, related_name="balances")
    quantity = models.DecimalField(max_digits=15, decimal_places=4, default=0)

    class Meta:
        unique_together = ("branch", "ingredient")
        verbose_name_plural = "Stock Balances"

    def __str__(self):
        return f"{self.branch.name}: {self.ingredient.name} = {self.quantity}"


# --- 4. STOCK MOVEMENT (Новое: История движений) ---
class StockMovement(BaseModel):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)
    ingredient = models.ForeignKey(Ingredient, on_delete=models.CASCADE)

    type = models.CharField(max_length=20, choices=StockMovementType.choices)
    quantity = models.DecimalField(max_digits=15, decimal_places=4)  # + или -

    cost_at_time = models.DecimalField(max_digits=19, decimal_places=4)  # Цена момента движения

    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.type}: {self.quantity} of {self.ingredient.name}"


# --- 5. PROCUREMENT (Новое: Заказы поставщикам) ---
class PurchaseOrder(BaseModel, SoftDeleteMixin):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        SENT = "SENT", _("Sent to Supplier")
        RECEIVED = "RECEIVED", _("Received (Closed)")
        CANCELLED = "CANCELLED", _("Cancelled")

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE)  # Куда везем
    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT)

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    order_date = models.DateField(default=timezone.now)
    delivery_date = models.DateField(null=True, blank=True)

    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def receive_order(self):
        """
        Логика приемки товара на склад
        """
        from decimal import Decimal
        from django.db import transaction

        with transaction.atomic():
            locked = PurchaseOrder.objects.select_for_update().get(pk=self.pk)
            if locked.status == self.Status.RECEIVED:
                return

            for item in locked.items.select_related("ingredient").all():
                # Lock balance row (or create it) before writing
                balance, _ = StockBalance.objects.get_or_create(
                    branch=locked.branch,
                    ingredient=item.ingredient
                )
                balance = StockBalance.objects.select_for_update().get(pk=balance.pk)

                # Moving Average cost calculation (all Decimal to avoid float drift)
                old_qty = balance.quantity
                old_cost = item.ingredient.current_cost
                incoming_qty = item.quantity
                incoming_cost = item.price_per_unit
                new_total_qty = old_qty + incoming_qty

                if new_total_qty > 0:
                    new_avg_cost = (
                        (old_qty * old_cost) + (incoming_qty * incoming_cost)
                    ) / new_total_qty
                else:
                    new_avg_cost = incoming_cost

                Ingredient.objects.filter(pk=item.ingredient_id).update(current_cost=new_avg_cost)

                balance.quantity = new_total_qty
                balance.save()

                StockMovement.objects.create(
                    branch=locked.branch,
                    ingredient=item.ingredient,
                    type=StockMovementType.IN_PURCHASE,
                    quantity=incoming_qty,
                    cost_at_time=incoming_cost,
                    notes=f"PO #{str(locked.id)[:8]}"
                )

            locked.status = self.Status.RECEIVED
            locked.save()
            self.status = locked.status


class PurchaseOrderItem(BaseModel):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name="items")
    ingredient = models.ForeignKey(Ingredient, on_delete=models.PROTECT)

    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    price_per_unit = models.DecimalField(max_digits=12, decimal_places=2)  # Цена закупки

    total_price = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.price_per_unit
        super().save(*args, **kwargs)