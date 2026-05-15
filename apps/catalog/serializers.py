from rest_framework import serializers
from django.utils.text import slugify
from .models import Category, MenuItem, MenuItemVariant, BranchMenuItem, Allergen, Modifier, ModifierGroup


# --- 1. Helper Serializers (read-only, for public API) ---
class AllergenSerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergen
        fields = ["id", "name"]


class VariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuItemVariant
        fields = ["id", "name", "price_override"]


class ModifierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Modifier
        fields = ["id", "name", "price"]


class ModifierGroupSerializer(serializers.ModelSerializer):
    modifiers = ModifierSerializer(many=True, read_only=True)

    class Meta:
        model = ModifierGroup
        fields = ["id", "name", "allow_multiple", "modifiers"]


# --- 2. Menu Item Serializer (public) ---
class MenuItemSerializer(serializers.ModelSerializer):
    variants = VariantSerializer(many=True, read_only=True)
    allergens = AllergenSerializer(many=True, read_only=True)
    modifier_groups = ModifierGroupSerializer(many=True, read_only=True)
    price = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = [
            "id", "name", "description", "image",
            "base_price", "price",
            "allergens", "variants", "modifier_groups", "slug"
        ]

    def get_price(self, obj):
        """
        Logic: Try to find a Branch specific price.
        Uses prefetch cache (branch_links must be prefetched by the view).
        """
        branch_id = self.context.get("branch_id")

        if branch_id:
            # Use prefetch cache — avoids 1 query per item
            for branch_item in obj.branch_links.all():
                if str(branch_item.branch_id) == str(branch_id):
                    if branch_item.price:
                        return str(branch_item.price)
                    break

        return str(obj.base_price)


# --- 3. Category Serializer (public, with nested items) ---
class CategorySerializer(serializers.ModelSerializer):
    items = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "image", "items"]

    def get_items(self, obj):
        branch_id = self.context.get("branch_id")
        if not branch_id:
            return []

        items = obj.items.filter(
            status=MenuItem.Status.PUBLISHED,
            branch_links__branch_id=branch_id,
            branch_links__is_available=True,
            branch_links__is_visible=True
        ).distinct()

        return MenuItemSerializer(items, many=True, context=self.context).data


# ============================================================
# --- ADMIN / OWNER serializers (for Settings CRUD) ---
# ============================================================

class CategoryAdminSerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ["id", "name", "description", "sort_order", "image", "parent", "item_count"]

    def get_item_count(self, obj):
        return obj.items.filter(is_deleted=False).count()

    def create(self, validated_data):
        org = self.context["organization"]
        return Category.objects.create(organization=org, **validated_data)


class AllergenAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Allergen
        fields = ["id", "name"]

    def create(self, validated_data):
        org = self.context["organization"]
        return Allergen.objects.create(organization=org, **validated_data)


class ModifierWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = Modifier
        fields = ["id", "name", "price"]


class ModifierGroupAdminSerializer(serializers.ModelSerializer):
    modifiers = ModifierWriteSerializer(many=True, required=False)

    class Meta:
        model = ModifierGroup
        fields = ["id", "name", "allow_multiple", "modifiers"]

    def create(self, validated_data):
        modifiers_data = validated_data.pop("modifiers", [])
        group = ModifierGroup.objects.create(**validated_data)
        for m in modifiers_data:
            m.pop("id", None)
            Modifier.objects.create(group=group, **m)
        return group

    def update(self, instance, validated_data):
        modifiers_data = validated_data.pop("modifiers", None)
        instance.name = validated_data.get("name", instance.name)
        instance.allow_multiple = validated_data.get("allow_multiple", instance.allow_multiple)
        instance.save()

        if modifiers_data is not None:
            existing_ids = set(instance.modifiers.values_list("id", flat=True))
            submitted_ids = {m["id"] for m in modifiers_data if "id" in m}

            # Delete removed modifiers
            instance.modifiers.filter(id__in=existing_ids - submitted_ids).delete()

            for m in modifiers_data:
                mid = m.get("id")
                if mid and mid in existing_ids:
                    Modifier.objects.filter(id=mid).update(name=m["name"], price=m.get("price", 0))
                else:
                    m.pop("id", None)
                    Modifier.objects.create(group=instance, **m)
        return instance


class VariantWriteSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False)

    class Meta:
        model = MenuItemVariant
        fields = ["id", "name", "price_override"]


class MenuItemAdminSerializer(serializers.ModelSerializer):
    variants = VariantWriteSerializer(many=True, required=False)
    allergen_ids = serializers.PrimaryKeyRelatedField(
        queryset=Allergen.objects.all(), many=True, source="allergens", required=False
    )
    modifier_group_ids = serializers.PrimaryKeyRelatedField(
        queryset=ModifierGroup.objects.all(), many=True, source="modifier_groups", required=False
    )
    category_name = serializers.CharField(source="category.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = MenuItem
        fields = [
            "id", "name", "description", "image", "base_price",
            "category", "category_name", "status", "status_display", "slug",
            "allergen_ids", "modifier_group_ids", "variants",
        ]
        read_only_fields = ["slug"]

    def _save_variants(self, instance, variants_data):
        existing_ids = set(instance.variants.values_list("id", flat=True))
        submitted_ids = {v["id"] for v in variants_data if "id" in v}
        instance.variants.filter(id__in=existing_ids - submitted_ids).delete()
        for v in variants_data:
            vid = v.get("id")
            if vid and vid in existing_ids:
                MenuItemVariant.objects.filter(id=vid).update(
                    name=v["name"], price_override=v.get("price_override")
                )
            else:
                v.pop("id", None)
                MenuItemVariant.objects.create(item=instance, **v)

    def create(self, validated_data):
        org = self.context["organization"]
        variants_data = validated_data.pop("variants", [])
        allergens = validated_data.pop("allergens", [])
        modifier_groups = validated_data.pop("modifier_groups", [])
        validated_data["slug"] = slugify(validated_data["name"])
        instance = MenuItem.objects.create(organization=org, **validated_data)
        instance.allergens.set(allergens)
        instance.modifier_groups.set(modifier_groups)
        self._save_variants(instance, variants_data)
        return instance

    def update(self, instance, validated_data):
        variants_data = validated_data.pop("variants", None)
        allergens = validated_data.pop("allergens", None)
        modifier_groups = validated_data.pop("modifier_groups", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if allergens is not None:
            instance.allergens.set(allergens)
        if modifier_groups is not None:
            instance.modifier_groups.set(modifier_groups)
        if variants_data is not None:
            self._save_variants(instance, variants_data)
        return instance