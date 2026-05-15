from django.contrib import admin, messages
from .models import Ingredient, Supplier, StockBalance, StockMovement, PurchaseOrder, PurchaseOrderItem

class PurchaseOrderItemInline(admin.TabularInline):
    model = PurchaseOrderItem
    extra = 1
    autocomplete_fields = ["ingredient"]

@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ["name", "storage_unit", "current_cost", "min_stock_level"]
    search_fields = ["name"]
    list_filter = ["organization"]

@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ["id_short", "branch", "supplier", "status", "total_amount", "order_date"]
    list_filter = ["status", "branch", "supplier"]
    inlines = [PurchaseOrderItemInline]
    actions = ["mark_as_received"]

    def id_short(self, obj):
        return str(obj.id)[:8]

    # Кнопка для приемки товара
    @admin.action(description="Receive Goods (Update Stock)")
    def mark_as_received(self, request, queryset):
        for po in queryset:
            if po.status != PurchaseOrder.Status.RECEIVED:
                try:
                    po.receive_order()
                    self.message_user(request, f"Order {po.id} received. Stock updated.", messages.SUCCESS)
                except Exception as e:
                    self.message_user(request, f"Error receiving {po.id}: {e}", messages.ERROR)
            else:
                self.message_user(request, f"Order {po.id} is already received.", messages.WARNING)

@admin.register(StockBalance)
class StockBalanceAdmin(admin.ModelAdmin):
    list_display = ["branch", "ingredient", "quantity"]
    list_filter = ["branch"]
    search_fields = ["ingredient__name"]

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ["name", "phone", "email"]
    search_fields = ["name"]

@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ["created_at", "branch", "ingredient", "type", "quantity", "cost_at_time"]
    list_filter = ["type", "branch"]
    readonly_fields = [f.name for f in StockMovement._meta.fields]