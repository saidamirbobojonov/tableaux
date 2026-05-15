import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import BaseModel, SoftDeleteMixin
from apps.users.models import Branch


class QRType(models.TextChoices):
    TABLE = "TABLE", _("Dine-in Table")  # На стол
    PICKUP = "PICKUP", _("Pickup Point")  # На кассе/окне выдачи
    MARKETING = "MARKETING", _("Marketing/Ads")  # В инстаграме/листовке


class QRCode(BaseModel, SoftDeleteMixin):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="qr_codes")
    type = models.CharField(max_length=20, choices=QRType.choices, default=QRType.TABLE)

    # Название (например "Стол 5" или "Летняя терраса")
    name = models.CharField(max_length=50)

    # Номер стола (если это стол)
    table_number = models.CharField(max_length=10, blank=True, null=True)

    # СЕКРЕТНЫЙ ТОКЕН (Slug)
    # Клиент сканирует: https://app.yoursite.com/scan/d83j-9s8a...
    token = models.CharField(max_length=64, unique=True, editable=False)

    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.token:
            # Генерируем случайный токен при создании
            self.token = str(uuid.uuid4())
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.branch.name} - {self.name} ({self.type})"