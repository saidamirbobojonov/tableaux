from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0003_modifiergroup_modifier_menuitem_modifier_groups'),
        ('orders', '0002_order_shift'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='selected_modifiers',
            field=models.ManyToManyField(
                blank=True,
                related_name='order_items',
                to='catalog.modifier'
            ),
        ),
    ]
