from django.db import models
import uuid

# Create your models here.

BOT_TYPES = (
    ('semi-active', 'Semi-Active'),
    ('active', 'Active'),
)

class Bot(models.Model):
    id = models.CharField(max_length=32, primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=32, default='semi-active', choices=BOT_TYPES)
