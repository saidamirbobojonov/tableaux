from rest_framework import serializers
from django.db import transaction
from .models import Order, OrderItem, OrderType, OrderStatus
from apps.catalog.models import MenuItem, BranchMenuItem, MenuItemVariant, Modifier
from apps.users.models import Branch, Table, TableStatus
from .tasks import send_telegram_notification


# --- 1. Input Serializer (То, что шлет фронтенд внутри массива items) ---
class OrderItemInputSerializer(serializers.Serializer):
    menu_item_id = serializers.UUIDField()
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    variant_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    modifiers = serializers.ListField(child=serializers.IntegerField(), required=False)


# --- 2. Main Order Serializer ---
class OrderCreateSerializer(serializers.ModelSerializer):
    branch_id = serializers.UUIDField()
    table_id = serializers.UUIDField(required=False, allow_null=True)
    items = OrderItemInputSerializer(many=True)

    class Meta:
        model = Order
        fields = [
            "id", "branch_id", "order_type",
            "table_id", "table_number", "delivery_address", "customer_phone",
            "payment_method", "delivery_fee", "tip_amount", "discount_amount",
            "notes", "items", "total_amount"
        ]
        read_only_fields = ["id", "total_amount"]

    def validate(self, data):
        order_type = data.get("order_type")

        if order_type == OrderType.DELIVERY:
            if not data.get("delivery_address"):
                raise serializers.ValidationError({"delivery_address": "Address is required for delivery."})
            if not data.get("customer_phone"):
                raise serializers.ValidationError({"customer_phone": "Phone is required for delivery."})

        if not data.get("items"):
            raise serializers.ValidationError({"items": "Order cannot be empty."})

        return data

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        branch_id = validated_data.pop("branch_id")
        table_id = validated_data.pop("table_id", None)

        try:
            branch = Branch.objects.get(id=branch_id, is_deleted=False)
        except Branch.DoesNotExist:
            raise serializers.ValidationError("Invalid Branch ID")

        with transaction.atomic():
            from apps.shifts.models import WorkShift

            active_shift = WorkShift.objects.filter(
                branch=branch,
                status=WorkShift.Status.OPEN
            ).first()

            # Enforce shift requirement for staff-created orders
            request = self.context.get("request")
            if request and request.user and request.user.is_authenticated:
                if not active_shift:
                    raise serializers.ValidationError(
                        {"shift": "No active shift. Open a shift before creating orders."}
                    )

            # Resolve table FK and sync table_number
            table = None
            if table_id:
                try:
                    table = Table.objects.get(id=table_id, branch=branch, is_active=True)
                    validated_data["table_number"] = table.number
                except Table.DoesNotExist:
                    raise serializers.ValidationError({"table_id": "Table not found in this branch."})

            # Assign waiter if staff request
            created_by = None
            if request and request.user and request.user.is_authenticated:
                created_by = request.user

            # --- Create order ---
            order = Order.objects.create(
                branch=branch,
                shift=active_shift,
                table=table,
                created_by=created_by,
                **validated_data
            )

            # Mark table occupied
            if table:
                Table.objects.filter(pk=table.pk).update(status=TableStatus.OCCUPIED)

            # --- 3. Pre-fetch все menu items + modifier_groups одним запросом ---
            all_menu_item_ids = [d["menu_item_id"] for d in items_data]
            menu_items_map = {
                mi.id: mi
                for mi in MenuItem.objects.filter(
                    id__in=all_menu_item_ids
                ).prefetch_related("modifier_groups")
            }

            for item_data in items_data:
                menu_item_id = item_data["menu_item_id"]
                variant_id = item_data.get("variant_id")
                qty = item_data["quantity"]
                modifiers_ids = item_data.get("modifiers", [])

                menu_item = menu_items_map.get(menu_item_id)
                if not menu_item:
                    raise serializers.ValidationError(f"Menu Item {menu_item_id} not found")

                # Логика базовой цены
                final_price = menu_item.base_price
                branch_item = BranchMenuItem.objects.filter(branch=branch, item=menu_item).first()
                if branch_item:
                    if not branch_item.is_available or not branch_item.is_visible:
                        raise serializers.ValidationError(f"Item {menu_item.name} is unavailable.")
                    if branch_item.price:
                        final_price = branch_item.price

                # Логика Варианта
                variant = None
                if variant_id:
                    try:
                        variant = MenuItemVariant.objects.get(id=variant_id, item=menu_item)
                        if variant.price_override:
                            final_price = variant.price_override
                    except MenuItemVariant.DoesNotExist:
                        raise serializers.ValidationError(f"Variant {variant_id} invalid")

                # Создаем OrderItem
                order_item = OrderItem.objects.create(
                    order=order,
                    menu_item=menu_item,
                    variant=variant,
                    quantity=qty,
                    price=final_price,  # Цена за единицу (без модификаторов)
                    notes=item_data.get("notes", "")
                )

                # Привязываем Модификаторы (только те, что принадлежат группам этого блюда)
                if modifiers_ids:
                    valid_modifiers = Modifier.objects.filter(
                        id__in=modifiers_ids,
                        group__in=menu_item.modifier_groups.all()
                    )
                    found_ids = set(valid_modifiers.values_list("id", flat=True))
                    invalid = set(modifiers_ids) - found_ids
                    if invalid:
                        raise serializers.ValidationError(
                            f"Modifiers {list(invalid)} are not valid for '{menu_item.name}'."
                        )
                    order_item.selected_modifiers.set(valid_modifiers)

            # Пересчитываем итоговую сумму
            # (Важно: метод calculate_total в модели Order должен учитывать modifier.price!)
            order.calculate_total()

            # --- Асинхронная отправка в Telegram ---
            transaction.on_commit(lambda: send_telegram_notification.delay(order.id))

            return order


class OrderManageSerializer(serializers.ModelSerializer):
    items_details = serializers.SerializerMethodField()
    table_id = serializers.UUIDField(source="table.id", read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id", "branch", "order_type", "table_id", "table_number", "status",
            "payment_method", "total_amount", "delivery_fee", "tip_amount", "discount_amount",
            "delivery_address", "customer_phone", "created_at", "items_details", "notes",
            "created_by_name"
        ]
        read_only_fields = [
            "id", "branch", "total_amount", "created_at", "items_details",
            "table_id", "created_by_name"
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            full = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full or obj.created_by.email
        return None

    def get_items_details(self, obj):
        return [
            {
                "name": item.menu_item.name,
                "variant": item.variant.name if item.variant else None,
                "quantity": item.quantity,
                "price": str(item.price),
                "total": str(item.total_price),
                "modifiers": [
                    {"name": m.name, "price": str(m.price)}
                    for m in item.selected_modifiers.all()
                ],
                "notes": item.notes,
            }
            for item in obj.items.prefetch_related("selected_modifiers").all()
        ]

    def update(self, instance, validated_data):
        """Allow status and payment_method updates; free table when terminal."""
        new_status = validated_data.get("status", instance.status)
        result = super().update(instance, validated_data)
        # Free table when order is done
        if new_status in (OrderStatus.COMPLETED, OrderStatus.CANCELLED, OrderStatus.DELIVERED):
            if instance.table_id:
                Table.objects.filter(pk=instance.table_id).update(status=TableStatus.AVAILABLE)
        return result


class OrderPaySerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(choices=["CASH", "CARD", "QR"])

    def save(self, order: Order):
        from django.db import transaction as tx
        method = self.validated_data["payment_method"]
        with tx.atomic():
            locked = Order.objects.select_for_update().get(pk=order.pk)
            terminal = {OrderStatus.COMPLETED, OrderStatus.DELIVERED, OrderStatus.CANCELLED}
            if locked.status in terminal:
                raise serializers.ValidationError("Order is already in a terminal state.")
            locked.payment_method = method
            try:
                locked.complete_order()   # handles inventory + sets COMPLETED/DELIVERED
            except ValueError as e:
                raise serializers.ValidationError(str(e))
            # Free table
            if locked.table_id:
                Table.objects.filter(pk=locked.table_id).update(status=TableStatus.AVAILABLE)
        return locked