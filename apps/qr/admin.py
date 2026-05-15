import qrcode
import base64
from io import BytesIO
from django.contrib import admin
from django.utils.html import format_html
from django.conf import settings
from .models import QRCode


@admin.register(QRCode)
class QRCodeAdmin(admin.ModelAdmin):
    list_display = ["name", "branch", "type", "table_number", "show_qr_preview", "is_active"]
    list_filter = ["branch", "type"]
    readonly_fields = ["token", "show_qr_preview"]

    # URL фронтенда (куда ведет QR код)
    # В продакшене это будет https://menu.mysite.com/scan/
    FRONTEND_URL = "https://myapp.com/q/"

    def show_qr_preview(self, obj):
        if not obj.token:
            return "-"

        # 1. Формируем ссылку
        target_url = f"{self.FRONTEND_URL}{obj.token}"

        # 2. Генерируем QR
        qr = qrcode.QRCode(box_size=4, border=1)
        qr.add_data(target_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        # 3. Конвертируем в base64 для отображения в HTML
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        img_str = base64.b64encode(buffer.getvalue()).decode()

        # 4. Выводим картинку прямо в админке
        return format_html(
            '<img src="data:image/png;base64,{}" width="100" height="100" /><br>'
            '<a href="{}" target="_blank">Test Link</a>',
            img_str, target_url
        )

    show_qr_preview.short_description = "QR Code"