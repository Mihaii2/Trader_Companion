# Generated by Django 5.1.6 on 2025-02-11 00:31

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trades_history', '0004_alter_trades_exit_reason'),
    ]

    operations = [
        migrations.AddField(
            model_name='trades',
            name='Case',
            field=models.TextField(blank=True, default=''),
        ),
    ]
