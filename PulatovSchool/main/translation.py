from modeltranslation.translator import register, TranslationOptions
from .models import (
    Hero, KPIStat, WhyUsItem,
    Announcement, NewsPost,
    AdmissionStep, AdmissionRequirement, AdmissionDeadline, FAQ,
    InfraSpace, InfraBullet, InfraPhoto,
    TimelineEntry, Teacher, GalleryPhoto,
    Document
)

# ВНИМАНИЕ: slug НЕ переводим, он только на английском (по требованию)

@register(Hero)
class HeroTR(TranslationOptions):
    fields = ("title", "subtitle", "description", "cta_primary_text", "cta_secondary_text",)

@register(KPIStat)
class KPIStatTR(TranslationOptions):
    fields = ("label",)

@register(WhyUsItem)
class WhyUsTR(TranslationOptions):
    fields = ("title", "description",)

@register(Announcement)
class AnnouncementTR(TranslationOptions):
    fields = ("title", "badge", "body",)

@register(NewsPost)
class NewsPostTR(TranslationOptions):
    fields = ("title", "excerpt", "body",)

@register(AdmissionStep)
class AdmissionStepTR(TranslationOptions):
    fields = ("title", "description", "button_text",)

@register(AdmissionRequirement)
class AdmissionRequirementTR(TranslationOptions):
    fields = ("text",)

@register(AdmissionDeadline)
class AdmissionDeadlineTR(TranslationOptions):
    fields = ("title", "date_label",)

@register(FAQ)
class FAQTR(TranslationOptions):
    fields = ("question", "answer",)

@register(InfraSpace)
class InfraSpaceTR(TranslationOptions):
    fields = ("title", "description",)

@register(InfraBullet)
class InfraBulletTR(TranslationOptions):
    fields = ("text",)

@register(InfraPhoto)
class InfraPhotoTR(TranslationOptions):
    fields = ("caption",)

@register(TimelineEntry)
class TimelineEntryTR(TranslationOptions):
    fields = ("title", "description",)

@register(Teacher)
class TeacherTR(TranslationOptions):
    fields = ("name", "role", "bio",)

@register(GalleryPhoto)
class GalleryPhotoTR(TranslationOptions):
    fields = ("caption",)

@register(Document)
class DocumentTR(TranslationOptions):
    fields = ("title",)