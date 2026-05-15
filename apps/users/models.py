from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from apps.core.models import BaseModel, SoftDeleteMixin


# --- 1. ROLES & CHOICES ---
class UserRole(models.TextChoices):
    OWNER = "OWNER", _("Owner")  # Полный доступ к Организации
    REGIONAL_MANAGER = "REGIONAL", _("Regional Manager")  # Доступ к группе филиалов
    BRANCH_MANAGER = "BRANCH_MAN", _("Branch Manager")  # Полный доступ к филиалу
    ACCOUNTANT = "ACCOUNTANT", _("Accountant")  # Финансы + Отчеты
    WAITER = "WAITER", _("Waiter")  # Только POS (создание заказов)
    CHEF = "CHEF", _("Chef")  # Только KDS (кухонный экран)


# --- 2. ORGANIZATION & BRANCH ---
class Organization(BaseModel, SoftDeleteMixin):
    """
    Холдинг или Сеть ресторанов.
    Верхнеуровневый контейнер для данных.
    """
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)  # Для URL (company.platform.com)
    tax_id = models.CharField(max_length=50, blank=True)  # ИНН

    def __str__(self):
        return self.name


class Branch(BaseModel, SoftDeleteMixin):
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="branches")
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True)  # saeed-kebab-center

    # --- CMS Content ---
    description = models.TextField(blank=True, help_text="Public description for website")
    address = models.TextField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    whatsapp = models.CharField(max_length=20, blank=True)
    instagram = models.CharField(max_length=100, blank=True)

    # Картинки
    logo = models.ImageField(upload_to="branch_logos/", blank=True, null=True)
    cover_image = models.ImageField(upload_to="branch_covers/", blank=True, null=True)  # Баннер сверху

    # Настройки
    timezone = models.CharField(max_length=50, default="Asia/Dushanbe")
    currency = models.CharField(max_length=3, default="TJS")

    # Брендинг (уникальные цвета и настройки каждого филиала)
    primary_color = models.CharField(max_length=7, default="#a7a66c", help_text="Brand primary hex color")
    secondary_color = models.CharField(max_length=7, default="#151513", help_text="Brand secondary hex color")

    # Финансовые настройки
    default_delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    default_tip_percent = models.PositiveSmallIntegerField(
        default=10, help_text="Suggested tip % shown at checkout (0 to disable)"
    )

    class Meta:
        verbose_name_plural = "Branches"

    def __str__(self):
        return f"{self.organization.name} - {self.name}"


# --- График работы ---
class WeekDay(models.IntegerChoices):
    MONDAY = 0, _("Monday")
    TUESDAY = 1, _("Tuesday")
    WEDNESDAY = 2, _("Wednesday")
    THURSDAY = 3, _("Thursday")
    FRIDAY = 4, _("Friday")
    SATURDAY = 5, _("Saturday")
    SUNDAY = 6, _("Sunday")


class BranchWorkSchedule(BaseModel):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="schedules")
    day = models.IntegerField(choices=WeekDay.choices)

    is_closed = models.BooleanField(default=False)
    open_time = models.TimeField(default="09:00")
    close_time = models.TimeField(default="22:00")

    class Meta:
        unique_together = ("branch", "day")
        ordering = ["day"]

    def clean(self):
        from django.core.exceptions import ValidationError
        if not self.is_closed and self.open_time and self.close_time:
            if self.open_time >= self.close_time:
                raise ValidationError(
                    {"close_time": "Close time must be later than open time."}
                )

    def __str__(self):
        day_name = WeekDay(self.day).label
        if self.is_closed:
            return f"{self.branch.name} - {day_name}: CLOSED"
        return f"{self.branch.name} - {day_name}: {self.open_time} - {self.close_time}"

# --- 3. CUSTOM USER ---
class UserManager(BaseUserManager):
    """Кастомный менеджер, так как мы используем email вместо username"""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The Email field must be set")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        if password:
            user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractUser, BaseModel, SoftDeleteMixin):
    """
    Глобальный пользователь.
    Внимание: У юзера нет поля 'role' здесь, так как роль зависит от Организации.
    """
    username = None  # Удаляем поле username
    email = models.EmailField(_("email address"), unique=True)

    phone = models.CharField(max_length=20, blank=True, null=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    def __str__(self):
        return self.email


# --- 4. MEMBERSHIP (RBAC CORE) ---
class Membership(BaseModel):
    """
    Связь Юзера с Организацией и его Роль.
    Здесь определяется: "Этот юзер — Менеджер в Этом ресторане".
    """
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="memberships"
    )
    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships"
    )
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.WAITER
    )

    # Ограничение доступа к конкретным бранчам.
    # Если пусто — значит доступ ко всей организации (если роль позволяет, например Owner).
    # Если заполнено — доступ только к этим бранчам.
    allowed_branches = models.ManyToManyField(
        Branch,
        blank=True,
        related_name="members"
    )

    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("user", "organization")  # Один юзер — одна роль в организации (для простоты)

    def __str__(self):
        return f"{self.user.email} -> {self.organization.name} ({self.role})"


# --- 5. BRANCH TABLES ---
class TableStatus(models.TextChoices):
    AVAILABLE = "AVAILABLE", _("Available")
    OCCUPIED = "OCCUPIED", _("Occupied")
    RESERVED = "RESERVED", _("Reserved")


class TableShape(models.TextChoices):
    RECT = "rect", _("Rectangle")
    ROUND = "round", _("Round")
    SQUARE = "square", _("Square")


class Table(BaseModel):
    """Physical table in a branch."""
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name="tables")
    number = models.CharField(max_length=10)        # "1", "VIP1", "A3"
    name = models.CharField(max_length=50, blank=True)  # optional display name
    capacity = models.PositiveSmallIntegerField(default=4)
    status = models.CharField(max_length=20, choices=TableStatus.choices, default=TableStatus.AVAILABLE)
    is_active = models.BooleanField(default=True)

    # Floor-plan positioning (percentage of hall canvas, 0–100)
    pos_x = models.FloatField(default=10.0)
    pos_y = models.FloatField(default=10.0)
    width = models.FloatField(default=9.0)
    height = models.FloatField(default=12.0)
    shape = models.CharField(max_length=10, choices=TableShape.choices, default=TableShape.RECT)

    class Meta:
        ordering = ["number"]
        unique_together = [("branch", "number")]

    def __str__(self):
        return f"{self.branch.name} – Table {self.number}"