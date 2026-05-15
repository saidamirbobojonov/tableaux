from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.core.validators import FileExtensionValidator

try:
    from unidecode import unidecode
except ImportError:
    def unidecode(s):  # fallback
        return s

# ----- Base mixins -----

class TimeStamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class Ordered(models.Model):
    position = models.PositiveIntegerField(default=0, db_index=True)

    class Meta:
        abstract = True
        ordering = ("position", "id")

class Publishable(models.Model):
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    class Meta:
        abstract = True


# ----- Home / Hero / KPI / WhyUs -----

class Hero(TimeStamped, Publishable, Ordered):
    # section hero (фон, заголовок, подзаголовок, 2 кнопки)
    title = models.CharField(max_length=255)
    subtitle = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    bg_image = models.ImageField(upload_to="hero/", blank=True, null=True)
    cta_primary_text = models.CharField(max_length=120, blank=True)
    cta_primary_url = models.URLField(blank=True)
    cta_secondary_text = models.CharField(max_length=120, blank=True)
    cta_secondary_url = models.URLField(blank=True)

    class Meta(Ordered.Meta):
        verbose_name = "Hero-блок"
        verbose_name_plural = "Hero-блоки"


class KPIStat(TimeStamped, Ordered):
    # «Лет школе», «Педагогов», «Учеников»
    label = models.CharField(max_length=120)
    value = models.PositiveIntegerField(default=0)
    year_start = models.PositiveIntegerField(blank=True, null=True, help_text="Если задан, возраст = текущий год - это значение.")
    icon_svg = models.TextField(blank=True, help_text="Вставь <svg>…</svg> или пусто.")

    class Meta(Ordered.Meta):
        verbose_name = "KPI показатель"
        verbose_name_plural = "KPI показатели"


class WhyUsItem(TimeStamped, Publishable, Ordered):
    # блок «Почему мы?»
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    icon_svg = models.TextField(blank=True)

    class Meta(Ordered.Meta):
        verbose_name = "Преимущество"
        verbose_name_plural = "Преимущества"


# ----- Анонсы / Новости -----

class Announcement(TimeStamped, Publishable, Ordered):
    # «Анонсы» (дата/время, бейдж)
    CATEGORY_CHOICES = (
        ("event", "Событие"),
        ("olymp", "Олимпиады"),
        ("club", "Кружки"),
        ("other", "Другое"),
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="event")
    start_at = models.DateTimeField(default=timezone.now)
    end_at = models.DateTimeField(blank=True, null=True)
    badge = models.CharField(max_length=60, blank=True)
    body = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = getattr(self, "title_en", None) or self.title
            self.slug = slugify(unidecode(base))[:250]
        super().save(*args, **kwargs)

    class Meta(Ordered.Meta):
        verbose_name = "Анонс"
        verbose_name_plural = "Анонсы"


class NewsPost(TimeStamped, Publishable, Ordered):
    CATEGORY_CHOICES = (
        ("event", "Событие"),
        ("project", "Проект"),
        ("achievement", "Достижение"),
        ("notice", "Объявление"),
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    excerpt = models.TextField(blank=True)
    body = models.TextField(blank=True)
    cover = models.ImageField(upload_to="news/covers/", blank=True, null=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="event")
    published_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        if not self.slug:
            base = getattr(self, "title_en", None) or self.title
            self.slug = slugify(unidecode(base))[:250]
        super().save(*args, **kwargs)

    class Meta(Ordered.Meta):
        verbose_name = "Новость"
        verbose_name_plural = "Новости"


class NewsGallery(TimeStamped, Ordered):
    # отдельная галерея для News (как просили)
    news = models.ForeignKey(NewsPost, on_delete=models.CASCADE, related_name="gallery")
    image = models.ImageField(upload_to="news/gallery/")
    caption = models.CharField(max_length=255, blank=True)
    aspect_ratio = models.CharField(
        max_length=10,
        choices=(("16:9", "16:9"), ("4:3", "4:3"), ("3:4", "3:4")),
        default="4:3"
    )

    class Meta(Ordered.Meta):
        verbose_name = "Фото новости"
        verbose_name_plural = "Галерея новостей"


# ----- Поступление (Admissions) -----

class AdmissionStep(TimeStamped, Ordered, Publishable):
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    button_text = models.CharField(max_length=80, blank=True)
    button_url = models.URLField(blank=True)

    class Meta(Ordered.Meta):
        verbose_name = "Шаг поступления"
        verbose_name_plural = "Шаги поступления"


class AdmissionRequirement(TimeStamped, Ordered):
    text = models.CharField(max_length=255)
    group = models.CharField(max_length=80, blank=True, help_text="Опциональная группа требований")

    class Meta(Ordered.Meta):
        verbose_name = "Требование поступления"
        verbose_name_plural = "Требования поступления"


class AdmissionDeadline(TimeStamped, Ordered):
    title = models.CharField(max_length=120)
    date_label = models.CharField(max_length=120)  # например: "до 31 мая"

    class Meta(Ordered.Meta):
        verbose_name = "Дедлайн приёма"
        verbose_name_plural = "Дедлайны приёма"


class FAQ(TimeStamped, Ordered, Publishable):
    question = models.CharField(max_length=255)
    answer = models.TextField()

    class Meta(Ordered.Meta):
        verbose_name = "FAQ"
        verbose_name_plural = "FAQ"


# ----- Инфраструктура -----

class InfraSpace(TimeStamped, Publishable, Ordered):
    # Школьный корпус, Спортивная зона, Столовая, Спортзал, Двор
    key = models.SlugField(max_length=64, unique=True, help_text="Технический ключ: school, sport-zone, cafeteria, sport-gym, yard")
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)

    class Meta(Ordered.Meta):
        verbose_name = "Пространство инфраструктуры"
        verbose_name_plural = "Инфраструктура: пространства"


class InfraBullet(TimeStamped, Ordered):
    space = models.ForeignKey(InfraSpace, on_delete=models.CASCADE, related_name="bullets")
    text = models.CharField(max_length=200)

    class Meta(Ordered.Meta):
        verbose_name = "Пункт описания пространства"
        verbose_name_plural = "Пункты описания пространства"


class InfraPhoto(TimeStamped, Ordered):
    space = models.ForeignKey(InfraSpace, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to="infra/")
    caption = models.CharField(max_length=255, blank=True)
    aspect_ratio = models.CharField(
        max_length=10,
        choices=(("16:9", "16:9"), ("4:3", "4:3")),
        default="16:9"
    )

    class Meta(Ordered.Meta):
        verbose_name = "Фото инфраструктуры"
        verbose_name_plural = "Фото инфраструктуры"


# ----- История (хронология) -----

class TimelineEntry(TimeStamped, Ordered):
    year = models.PositiveIntegerField()
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    icon_svg = models.TextField(blank=True)

    class Meta(Ordered.Meta):
        verbose_name = "Событие хронологии"
        verbose_name_plural = "Хронология"


# ----- Команда -----

class Teacher(TimeStamped, Publishable, Ordered):
    name = models.CharField(max_length=160)
    role = models.CharField(max_length=160, blank=True)
    photo = models.ImageField(upload_to="team/", blank=True, null=True)
    bio = models.TextField(blank=True)

    class Meta(Ordered.Meta):
        verbose_name = "Педагог"
        verbose_name_plural = "Педагоги"


# ----- Галерея (вертикальные «потоки») -----

class GalleryPhoto(TimeStamped, Ordered, Publishable):
    image = models.ImageField(upload_to="gallery/")
    caption = models.CharField(max_length=255, blank=True)
    aspect_ratio = models.CharField(
        max_length=10,
        choices=(("3:4", "3:4"), ("4:3", "4:3")),
        default="3:4"
    )
    column = models.PositiveSmallIntegerField(default=1, help_text="Для раскладки на стрим-колонки (1..3)")

    class Meta(Ordered.Meta):
        verbose_name = "Фото галереи"
        verbose_name_plural = "Галерея"


# ----- Документы / Лицензии -----

class Document(TimeStamped, Publishable, Ordered):
    CATEGORY_CHOICES = (
        ("license", "Лицензия"),
        ("policy", "Политика"),
        ("report", "Отчёт"),
        ("other", "Прочее"),
    )
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True, help_text="Только английский")
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default="license")
    file = models.FileField(
        upload_to="docs/",
        validators=[FileExtensionValidator(["pdf", "doc", "docx", "xls", "xlsx"])],
        blank=True, null=True
    )
    external_url = models.URLField(blank=True)
    version = models.CharField(max_length=40, blank=True)
    date = models.DateField(default=timezone.now)

    def clean(self):
        if not self.file and not self.external_url:
            from django.core.exceptions import ValidationError
            raise ValidationError("Нужно указать файл или внешнюю ссылку.")

    def save(self, *args, **kwargs):
        if not self.slug:
            base = getattr(self, "title_en", None) or self.title
            self.slug = slugify(unidecode(base))[:250]
        super().save(*args, **kwargs)

    class Meta(Ordered.Meta):
        verbose_name = "Документ"
        verbose_name_plural = "Документы"