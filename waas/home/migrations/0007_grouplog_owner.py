# Generated by Django 3.2.21 on 2024-01-22 14:15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('home', '0006_grouplog'),
    ]

    operations = [
        migrations.AddField(
            model_name='grouplog',
            name='owner',
            field=models.CharField(blank=True, max_length=100, null=True),
        ),
    ]
