import uuid
from django.db import models

class BaseModel(models.Model):
    """
    Базовая модель для ВСЕХ сущностей в системе.
    Внедряет UUID вместо ID и TimeStamps.
    """
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True  # Django не создаст таблицу для этой модели
        ordering = ["-created_at"]

class SoftDeleteMixin(models.Model):
    """
    Миксин для безопасного удаления.
    Для важных данных (финансы, склад) физическое удаление запрещено.
    """
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()


from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.conf import settings


class AuditLog(models.Model):
    ACTION_CREATE = 'CREATE'
    ACTION_UPDATE = 'UPDATE'
    ACTION_DELETE = 'DELETE'
    ACTION_LOGIN = 'LOGIN'
    ACTION_CUSTOM = 'CUSTOM'  # Например, "Закрытие кассы"

    ACTION_CHOICES = [
        (ACTION_CREATE, 'Create'),
        (ACTION_UPDATE, 'Update'),
        (ACTION_DELETE, 'Delete'),
        (ACTION_LOGIN, 'Login'),
        (ACTION_CUSTOM, 'Custom'),
    ]

    # Кто сделал
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='audit_logs'
    )

    # Что сделал
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)

    # Над чем (Полиморфная связь)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.UUIDField()  # У нас везде UUID
    content_object = GenericForeignKey('content_type', 'object_id')

    # Детали (JSON для гибкости: хранить before/after, IP, UserAgent)
    payload = models.JSONField(default=dict)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["content_type", "object_id"]),
            models.Index(fields=["actor"]),
            models.Index(fields=["created_at"]),
        ]