from django.db import transaction
from rest_framework import serializers
from .models import Ingredient, Supplier, StockBalance, PurchaseOrder, PurchaseOrderItem


class IngredientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ingredient
        fields = [
            "id", "name", "storage_unit", "current_cost",
            "min_stock_level", "organization"
        ]
        read_only_fields = ["id", "current_cost"]


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ["id", "name", "contact_name", "phone", "email", "tax_id", "organization"]
        read_only_fields = ["id"]


class StockBalanceSerializer(serializers.ModelSerializer):
    ingredient_name = serializers.CharField(source="ingredient.name", read_only=True)
    storage_unit = serializers.CharField(source="ingredient.storage_unit", read_only=True)
    min_stock_level = serializers.DecimalField(
        source="ingredient.min_stock_level",
        max_digits=10, decimal_places=3, read_only=True
    )
    is_low_stock = serializers.SerializerMethodField()

    class Meta:
        model = StockBalance
        fields = [
            "id", "branch", "ingredient", "ingredient_name",
            "storage_unit", "quantity", "min_stock_level", "is_low_stock"
        ]
        read_only_fields = ["id", "ingredient_name", "storage_unit", "min_stock_level", "is_low_stock"]

    def get_is_low_stock(self, obj):
        return obj.quantity <= obj.ingredient.min_stock_level


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseOrderItem
        fields = ["id", "ingredient", "quantity", "price_per_unit", "total_price"]
        read_only_fields = ["id", "total_price"]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "organization", "branch", "supplier", "status",
            "order_date", "delivery_date", "total_amount", "items"
        ]
        read_only_fields = ["id", "total_amount", "status"]

    def create(self, validated_data):
        items_data = validated_data.pop("items")
        with transaction.atomic():
            po = PurchaseOrder.objects.create(**validated_data)
            total = 0
            for item_data in items_data:
                item = PurchaseOrderItem.objects.create(purchase_order=po, **item_data)
                total += item.total_price
            po.total_amount = total
            po.save(update_fields=["total_amount"])
        return po
