from django.shortcuts import render, redirect
from django.http import HttpResponse, HttpResponseRedirect, JsonResponse
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib import messages
from django.contrib.auth.models import User
from django.contrib.auth.decorators import login_required
from .models import Bot, BotMessage, GroupLog, GroupTag
from pathlib import Path
from django.conf import settings
import os
import shutil
import requests
from django.conf import settings
HOST_URL = settings.HOST_URL

def index(request):
    return render(request, 'home/index.html', {'HOST_URL': HOST_URL})



def logout(request):
    if request.user.is_authenticated:
        auth_logout(request)
        
    return redirect('home')

