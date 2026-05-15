from django.contrib import admin
from .models import (
    Hero, KPIStat, WhyUsItem,
    Announcement, NewsPost, NewsGallery,
    AdmissionStep, AdmissionRequirement, AdmissionDeadline, FAQ,
    InfraSpace, InfraBullet, InfraPhoto,
    TimelineEntry, Teacher, GalleryPhoto,
    Document
)

# ----- Inlines -----

class NewsGalleryInline(admin.TabularInline):
    model = NewsGallery
    extra = 1
    fields = ("image", "caption", "aspect_ratio", "position",)
    ordering = ("position", "id")


class InfraBulletInline(admin.TabularInline):
    model = InfraBullet
    extra = 1
    fields = ("text", "position",)
    ordering = ("position", "id")


class InfraPhotoInline(admin.TabularInline):
    model = InfraPhoto
    extra = 1
    fields = ("image", "caption", "aspect_ratio", "position",)
    ordering = ("position", "id")


# ----- ModelAdmins -----

@admin.register(Hero)
class HeroAdmin(admin.ModelAdmin):
    list_display = ("__str__", "is_active", "position")
    list_editable = ("is_active", "position")
    search_fields = ("title", "subtitle",)
    def __str__(self):  # for nicer display
        return "Hero"


@admin.register(KPIStat)
class KPIStatAdmin(admin.ModelAdmin):
    list_display = ("label", "value", "year_start", "position")
    list_editable = ("value", "year_start", "position")
    search_fields = ("label",)


@admin.register(WhyUsItem)
class WhyUsItemAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "position")
    list_editable = ("is_active", "position")
    search_fields = ("title",)


@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "start_at", "is_active", "position")
    list_filter = ("category", "is_active")
    search_fields = ("title", "body")
    prepopulated_fields = {"slug": ("title_en",)}
    date_hierarchy = "start_at"
    list_editable = ("is_active", "position")


@admin.register(NewsPost)
class NewsPostAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "published_at", "is_active", "is_featured", "position")
    list_filter = ("category", "is_active", "is_featured")
    search_fields = ("title", "excerpt", "body")
    prepopulated_fields = {"slug": ("title_en",)}
    date_hierarchy = "published_at"
    inlines = [NewsGalleryInline]
    list_editable = ("is_active", "is_featured", "position")


@admin.register(AdmissionStep)
class AdmissionStepAdmin(admin.ModelAdmin):
    list_display = ("title", "is_active", "position")
    list_editable = ("is_active", "position")
    search_fields = ("title", "description")


@admin.register(AdmissionRequirement)
class AdmissionRequirementAdmin(admin.ModelAdmin):
    list_display = ("text", "group", "position")
    list_editable = ("group", "position")
    search_fields = ("text", "group")


@admin.register(AdmissionDeadline)
class AdmissionDeadlineAdmin(admin.ModelAdmin):
    list_display = ("title", "date_label", "position")
    list_editable = ("date_label", "position")
    search_fields = ("title", "date_label")


@admin.register(FAQ)
class FAQAdmin(admin.ModelAdmin):
    list_display = ("question", "is_active", "position")
    list_editable = ("is_active", "position")
    search_fields = ("question", "answer")


@admin.register(InfraSpace)
class InfraSpaceAdmin(admin.ModelAdmin):
    list_display = ("title", "key", "is_active", "position")
    list_editable = ("is_active", "position")
    search_fields = ("title", "description", "key")
    prepopulated_fields = {"key": ("title_en",)}
    inlines = [InfraBulletInline, InfraPhotoInline]


@admin.register(TimelineEntry)
class TimelineEntryAdmin(admin.ModelAdmin):
    list_display = ("year", "title", "position")
    list_editable = ("position",)
    search_fields = ("title", "description")
    list_filter = ("year",)


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ("name", "role", "is_active", "is_featured", "position")
    list_editable = ("is_active", "is_featured", "position")
    search_fields = ("name", "role")


@admin.register(GalleryPhoto)
class GalleryPhotoAdmin(admin.ModelAdmin):
    list_display = ("caption", "aspect_ratio", "column", "is_active", "position")
    list_editable = ("aspect_ratio", "column", "is_active", "position")
    search_fields = ("caption",)


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "version", "date", "is_active", "position")
    list_filter = ("category", "is_active")
    search_fields = ("title", "version")
    prepopulated_fields = {"slug": ("title_en",)}