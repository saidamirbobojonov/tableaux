import json
from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "actor", "action", "content_type", "object_id_short"]
    list_filter = ["action", "content_type", "created_at"]
    search_fields = ["actor__email", "object_id"]
    readonly_fields = [field.name for field in AuditLog._meta.fields]  # Всё поле ReadOnly

    def object_id_short(self, obj):
        return str(obj.object_id)[:8] + "..."

    def has_add_permission(self, request):
        return False  # Нельзя создавать логи вручную

    def has_delete_permission(self, request, obj=None):
        return False  # Нельзя удалять логи через админку

    # Красивый вывод JSON payload
    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['show_save_and_continue'] = False
        extra_context['show_save'] = False
        return super().change_view(request, object_id, form_url, extra_context)