from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.translation import gettext_lazy as _
from .models import User, Organization, Branch, Membership, BranchWorkSchedule


# --- Inlines (Вложенные формы) ---

class MembershipInline(admin.TabularInline):
    """Позволяет добавлять Юзера в Организацию прямо со страницы Юзера"""
    model = Membership
    extra = 0  # Не показывать пустые строки по умолчанию
    autocomplete_fields = ["organization", "allowed_branches"]


class BranchInline(admin.TabularInline):
    """Позволяет видеть филиалы внутри страницы Организации"""
    model = Branch
    extra = 0


# --- Model Admins ---

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Кастомная админка для User (так как у нас нет username).
    """
    ordering = ["email"]
    list_display = ["email", "phone", "is_staff", "is_active", "date_joined"]
    list_filter = ["is_staff", "is_active", "memberships__organization"]  # Фильтр по оргам
    search_fields = ["email", "phone", "memberships__organization__name"]

    # Конфигурация полей (убираем username)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (_("Personal info"), {"fields": ("phone", "avatar")}),
        (
            _("Permissions"),
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                ),
            },
        ),
        (_("Important dates"), {"fields": ("last_login", "date_joined")}),
    )

    # Настройки для создания юзера через админку
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "phone"),
            },
        ),
    )

    inlines = [MembershipInline]


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "tax_id", "created_at"]
    search_fields = ["name", "tax_id"]
    prepopulated_fields = {"slug": ("name",)}  # Авто-генерация slug из имени
    inlines = [BranchInline]


class WorkScheduleInline(admin.TabularInline):
    model = BranchWorkSchedule
    extra = 7  # Сразу показать 7 дней
    max_num = 7
    ordering = ("day",)


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "organization", "phone", "slug"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [WorkScheduleInline]  # <-- Добавили график

    fieldsets = (
        ("Basic Info", {"fields": ("organization", "name", "slug", "address", "phone")}),
        ("Socials", {"fields": ("whatsapp", "instagram")}),
        ("Design", {"fields": ("logo", "cover_image", "description")}),
        ("Settings", {"fields": ("timezone", "currency")}),
    )

@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ["user", "organization", "role", "is_active"]
    list_filter = ["organization", "role", "is_active"]
    search_fields = ["user__email", "organization__name"]
    autocomplete_fields = ["user", "organization", "allowed_branches"]