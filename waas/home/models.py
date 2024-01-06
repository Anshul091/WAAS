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
    botStarted = models.IntegerField(default=0)
    name = models.CharField(max_length=100)    # name of the bot
    username = models.CharField(max_length=100, blank=False, null=False)
    mobile = models.CharField(max_length=16)

    def __str__(self):
        return f'{self.id} | {self.name} | {self.username} | {self.type}'


class BotMessage(models.Model):
    botid = models.CharField(max_length=32, blank=False, null=False)
    chatid = models.CharField(max_length=32)
    message = models.TextField()
    isgroup = models.BooleanField()
    seen_cnt = models.IntegerField(default=0)
    read_cnt = models.IntegerField(default=0)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        msg = self.message
        if len(msg) > 20:
