# Generated by Django 5.1.6 on 2025-02-16 05:01

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('video_service', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='video',
            name='visual_analysis',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
