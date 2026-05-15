import logging
import requests
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)
from .models import Order


@shared_task
def send_telegram_notification(order_id):
    """
    Асинхронная задача. Выполняется рабочим (Worker), а не основным сайтом.
    """
    try:
        order = Order.objects.get(id=order_id)
    except Order.DoesNotExist:
        return "Order not found"

    chat_id = settings.TELEGRAM_CHAT_ID
    bot_token = settings.TELEGRAM_BOT_TOKEN

    if not chat_id or not bot_token:
        return "No Telegram Config"

    # Формируем текст (то же самое, что было раньше)
    items_str = ""
    for item in order.items.all():
        variant = f"({item.variant.name})" if item.variant else ""
        items_str += f"- {item.menu_item.name} {variant} x{item.quantity}\n"

    msg = (
        f"🔔 <b>NEW ORDER #{str(order.id)[:5]}</b>\n"
        f"🏢 <b>{order.branch.name}</b>\n"
        f"------------------\n"
        f"{items_str}"
        f"------------------\n"
        f"💰 <b>Total: {order.total_amount} TJS</b>\n"
        f"📍 Type: {order.order_type}\n"
    )
    if order.notes:
        msg += f"📝 Note: {order.notes}\n"

    # Отправка
    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    try:
        requests.post(url, data={"chat_id": chat_id, "text": msg, "parse_mode": "HTML"}, timeout=10)
        return f"Notification sent for Order {order.id}"
    except Exception as e:
        logger.error("Telegram notification failed for order %s: %s", order_id, e)
        return f"Failed to send: {e}"