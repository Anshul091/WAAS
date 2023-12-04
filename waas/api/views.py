from django.shortcuts import render, redirect
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
import requests
import json
import qrcode
from PIL import Image
import base64
from io import BytesIO
from django.views.decorators.csrf import csrf_exempt
from home.models import Bot, GroupTag
from collections import defaultdict
from django.conf import settings
HOST_URL = settings.HOST_URL

# Create your views here.
def login(request, id):
    resp = requests.get(f'{HOST_URL}/login/{id}')
    print(resp.content)
    return HttpResponse(resp.content)



def logout(request, id):
    resp = requests.get(f'{HOST_URL}/logout/{id}')
    print(resp.content)
    return HttpResponse(resp.content)


def status(request, id=None):
    if id:
        resp = requests.get(f'{HOST_URL}/status/{id}')
    else:
        resp = requests.get(f'{HOST_URL}/status')
    print(resp.content)
    return HttpResponse(resp.content)


def encode_qr_code(request):
    if request.method == 'GET':
        print(list(request.GET.items()))
        qrdata = request.GET.get('qrdata')
        print(qrdata)
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_L,
            box_size=10,
            border=4,
        )
        data = qrdata
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        img_buffer = BytesIO()
        img.save(img_buffer, format="PNG")
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode("utf-8")
        resp = {
            'img': "data:image/png;base64," + img_base64,
        }
        print(resp)
        return JsonResponse(resp)



def checkmobilenumber(request, id, mobile):
    if request.method == 'GET':
        bot = Bot.objects.filter(mobile=mobile).exclude(id=id)
        if bot.exists():
            print(bot.values())
            return JsonResponse({'newNumber': False, 'UserName': bot[0].username})
        else:
            resp = {
                'newNumber': True,
                'UserName': '',
            }
            return JsonResponse(resp)
        
        
        
        
def getgrouptags(request):
    if request.method == 'GET':
        botid = request.GET['botid']
        resp = {
            'status' : 'OK',
            'tags' : defaultdict(list)
        }
        rows = GroupTag.objects.filter(botid=botid)

        for row in rows:
            groupid = row.chatid
            tag = row.tag
            resp['tags'][groupid].append(tag)

        return JsonResponse(resp)