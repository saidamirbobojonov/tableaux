from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import BaseModel, SoftDeleteMixin
from apps.users.models import Organization, Branch
from decimal import Decimal
from apps.inventory.models import Ingredient, UnitType

# --- 1. CLASSIFICATIONS ---
class Allergen(BaseModel):
    name = models.CharField(max_length=100)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)

    def __str__(self):
        return self.name

class Category(BaseModel, SoftDeleteMixin):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    sort_order = models.PositiveIntegerField(default=0)
    image = models.ImageField(upload_to="categories/", blank=True, null=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ["sort_order", "name"]

    def __str__(self):
        return self.name

# NOTE: ModifierGroup and Modifier intentionally use integer PKs (not BaseModel/UUID).
# The OrderItemInputSerializer.modifiers field uses IntegerField to match.
# Migrating to UUID PK requires a complex multi-step data migration — scheduled for Phase 1.
class ModifierGroup(models.Model):
    name = models.CharField(max_length=100)
    allow_multiple = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class Modifier(models.Model):
    group = models.ForeignKey(ModifierGroup, on_delete=models.CASCADE, related_name="modifiers")
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=6, decimal_places=2, default=0)

    def __str__(self):
        price_str = f"+{self.price}" if self.price > 0 else "Free"
        return f"{self.name} ({price_str})"

# --- 2. GLOBAL MENU ITEM ---
class MenuItem(BaseModel, SoftDeleteMixin):
    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        PUBLISHED = "PUBLISHED", _("Published")
        ARCHIVED = "ARCHIVED", _("Archived")

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="items")

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="menu_items/", blank=True, null=True)
    modifier_groups = models.ManyToManyField(ModifierGroup, blank=True)
    base_price = models.DecimalField(max_digits=10, decimal_places=2)

    allergens = models.ManyToManyField(Allergen, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)

    # ⚠️ FIX: Убрали unique=True, так как "Burger" может быть у разных организаций.
    # В идеале нужно делать unique_together = ('slug', 'organization')
    slug = models.SlugField(max_length=255)

    class Meta:
        # Уникальность слага только ВНУТРИ одной организации
        unique_together = [("slug", "organization")]

    def calculate_food_cost(self):
        """Суммирует стоимость всех ингредиентов"""
        total_cost = sum(item.get_cost() for item in self.recipe_items.all())
        return total_cost

    def get_margin(self):
        cost = self.calculate_food_cost()
        if self.base_price > 0:
            margin = self.base_price - cost
            margin_percent = (margin / self.base_price) * 100
            return margin, margin_percent
        return 0, 0

    def __str__(self):
        return self.name

# --- 3. VARIANTS ---
class MenuItemVariant(BaseModel):
    item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name="variants")
    name = models.CharField(max_length=100)
    price_override = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Если пусто, берется base_price"
    )

    def __str__(self):
        return f"{self.item.name} - {self.name}"

# --- 4. BRANCH SPECIFIC ---
class BranchMenuItem(BaseModel):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="menu_items")
    item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name="branch_links")

    price = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Если пусто, используем глобальную base_price"
    )
    is_available = models.BooleanField(default=True)
    is_visible = models.BooleanField(default=True)

    class Meta:
        unique_together = ("branch", "item")

    def __str__(self):
        return f"{self.branch.name} -> {self.item.name}"

# --- 5. RECIPE (BOM) ---
class RecipeItem(models.Model):
    menu_item = models.ForeignKey(
        MenuItem,
        on_delete=models.CASCADE,
        related_name="recipe_items"
    )
    ingredient = models.ForeignKey(
        Ingredient,
        on_delete=models.PROTECT
    )
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit = models.CharField(
        max_length=10,
        choices=UnitType.choices,
        default=UnitType.GRAM
    )

    def get_cost(self):
        cost_per_storage_unit = self.ingredient.current_cost
        qty_in_storage_unit = self.quantity

        # Конвертация Грамм/Мл -> КГ/Л
        if self.unit in [UnitType.GRAM, UnitType.MILLILITER]:
            if self.ingredient.storage_unit in [UnitType.KG, UnitType.LITER]:
                qty_in_storage_unit = self.quantity / Decimal("1000.0")

        return qty_in_storage_unit * cost_per_storage_unit

    def __str__(self):
        return f"{self.ingredient.name} - {self.quantity}{self.unit}"