# Generated by Django 5.1.6 on 2025-04-06 15:26

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('personal_ranking_list_app', '0005_globalcharacteristic_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='globalcharacteristic',
            name='default_score',
        ),
        migrations.AddField(
            model_name='globalcharacteristic',
            name='score',
            field=models.IntegerField(default=0),
            preserve_default=False,
        ),
        migrations.CreateModel(
            name='StockPickCharacteristic',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('custom_score', models.IntegerField(blank=True, null=True)),
                ('characteristic', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='personal_ranking_list_app.globalcharacteristic')),
                ('stockpick', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='personal_ranking_list_app.stockpick')),
            ],
            options={
                'unique_together': {('stockpick', 'characteristic')},
            },
        ),
        migrations.AddField(
            model_name='stockpick',
            name='characteristics',
            field=models.ManyToManyField(related_name='stock_picks', through='personal_ranking_list_app.StockPickCharacteristic', to='personal_ranking_list_app.globalcharacteristic'),
        ),
        migrations.DeleteModel(
            name='StockCharacteristic',
        ),
    ]
