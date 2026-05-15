from rest_framework import serializers
from apps.orders.models import Order, OrderItem


class KDSModifierSerializer(serializers.Serializer):
    name = serializers.CharField()
    price = serializers.DecimalField(max_digits=6, decimal_places=2)


class KDSItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='menu_item.name')
    variant_name = serializers.SerializerMethodField()
    modifiers = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ['id', 'name', 'variant_name', 'quantity', 'notes', 'modifiers']

    def get_variant_name(self, obj):
        return obj.variant.name if obj.variant else None

    def get_modifiers(self, obj):
        return [
            {"name": m.name, "price": str(m.price)}
            for m in obj.selected_modifiers.all()
        ]


class KDSOrderSerializer(serializers.ModelSerializer):
    items = KDSItemSerializer(many=True, read_only=True)
    time_elapsed_seconds = serializers.SerializerMethodField()
    server_name = serializers.SerializerMethodField()
    # Expose delivery address so kitchen knows where it's going
    delivery_address = serializers.CharField(allow_null=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id',
            'table_number',
            'status',
            'order_type',
            'created_at',
            'time_elapsed_seconds',
            'server_name',
            'items',
            'notes',
            'delivery_address',
        ]

    def get_time_elapsed_seconds(self, obj):
        from django.utils import timezone
        delta = timezone.now() - obj.created_at
        return int(delta.total_seconds())

    def get_server_name(self, obj):
        if obj.created_by:
            full = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full or obj.created_by.email
        return "Guest"
