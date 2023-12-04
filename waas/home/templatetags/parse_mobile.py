from django import template
register = template.Library()

@register.filter
def parse_mobile(value):
    return value.replace('@c.us', '')