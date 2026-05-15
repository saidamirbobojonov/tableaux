from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("orders", "0004_order_table_alter_order_order_type"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="order",
            name="tip_amount",
            field=models.DecimalField(
                decimal_places=2, default=0, help_text="Tip / gratuity", max_digits=10
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="discount_amount",
            field=models.DecimalField(
                decimal_places=2, default=0, help_text="Discount applied", max_digits=10
            ),
        ),
        migrations.AddField(
            model_name="order",
            name="created_by",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_orders",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
