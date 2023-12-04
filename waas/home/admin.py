from django.contrib import admin
from .models import Bot, BotMessage, GroupLog, GroupTag
# Register your models here.


admin.site.register(Bot)
admin.site.register(BotMessage)
admin.site.register(GroupLog)
admin.site.register(GroupTag)