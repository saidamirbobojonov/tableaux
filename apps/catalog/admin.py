from django.contrib import admin
from .models import Category, MenuItem, MenuItemVariant, BranchMenuItem, Allergen, RecipeItem

class VariantInline(admin.TabularInline):
    model = MenuItemVariant
    extra = 1

class BranchAvailabilityInline(admin.TabularInline):
    model = BranchMenuItem
    extra = 0
    autocomplete_fields = ["branch"]

class RecipeItemInline(admin.TabularInline):
    model = RecipeItem
    extra = 1
    autocomplete_fields = ["ingredient"]

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "organization", "sort_order"]
    list_filter = ["organization"]

@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "base_price", "show_food_cost", "status"] # Добавил show_food_cost в таблицу
    list_filter = ["status", "organization", "category"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [VariantInline, BranchAvailabilityInline, RecipeItemInline]
    readonly_fields = ["show_food_cost"]

    # ✅ ВОТ ЭТОГО МЕТОДА НЕ ХВАТАЛО:
    def show_food_cost(self, obj):
        cost = obj.calculate_food_cost()
        return f"{cost:.2f} TJS"
    show_food_cost.short_description = "Food Cost (Calc)"

@admin.register(Allergen)
class AllergenAdmin(admin.ModelAdmin):
    list_display = ["name", "organization"]
    list_filter = ["organization"]