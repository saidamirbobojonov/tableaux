from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0004_table_floor_plan_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="branch",
            name="primary_color",
            field=models.CharField(
                default="#a7a66c",
                help_text="Brand primary hex color",
                max_length=7,
            ),
        ),
        migrations.AddField(
            model_name="branch",
            name="secondary_color",
            field=models.CharField(
                default="#151513",
                help_text="Brand secondary hex color",
                max_length=7,
            ),
        ),
        migrations.AddField(
            model_name="branch",
            name="default_delivery_fee",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="branch",
            name="default_tip_percent",
            field=models.PositiveSmallIntegerField(
                default=10,
                help_text="Suggested tip % shown at checkout (0 to disable)",
            ),
        ),
    ]
