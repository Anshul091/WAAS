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



def signup(request):
    if request.method == 'POST':
        username = request.POST['username']
        password1 = request.POST['password1']
        password2 = request.POST['password2']
        email = request.POST['email']


        if password1 == password2:
            if User.objects.filter(username=username).exists(): 
                messages.error(request, 'Username already exists')
                return redirect('signup')
            else:
                user = User.objects.create_user(username=username, password=password1, email=email)
                user.save()
                messages.success(request, 'Account created successfully')
                return redirect('login')
        else:
            messages.error(request, 'Passwords do not match')
            return redirect('signup')
    else:
        return render(request, 'home/signup.html',  {'HOST_URL': HOST_URL})
    
        
def login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']

        user = authenticate(request, username=username, password=password)

        if user is not None:
            auth_login(request, user)
            messages.success(request, 'Logged in successfully')
            return redirect('dashboard')
        else:
            messages.error(request, 'Invalid username or password')
            return redirect('login')
    else:
        return render(request, 'home/login.html', {'HOST_URL': HOST_URL})


@login_required
def dashboard(request):
    bots = Bot.objects.filter(username=request.user.username)
    return render(request, 'home/dashboard.html', {'bots': bots, 'HOST_URL': HOST_URL})



@login_required
def addbot(request):
    if request.method == 'POST':
        def isBotNameValid(name):
            if not name:
                return False, 'Bot name cannot be empty'
            if len(name) < 3:
                return False, 'Bot name must be atleast 3 characters long'
            if len(name) > 12:
                return False, 'Bot name must be atmost 12 characters long'
            if ' ' in name:
                return False, 'Bot name cannot contain spaces'
            if not name.isalnum():
                return False, 'Bot name can only contain alphabets and numbers'
            return True, 'Bot name is valid'
        
        botname = request.POST['botname']
        valid, msg = isBotNameValid(botname)
        if not valid:
            messages.error(request, msg)
            return redirect('dashboard')
        if Bot.objects.filter(name=botname, username=request.user.username).exists():
            messages.error(request, 'This Bot name already exists')
            return redirect('dashboard')
        bot = Bot.objects.create(username=request.user.username, name=botname)
        bot.save()
        messages.success(request, 'Bot added successfully')
        return redirect('dashboard')
    else:
        return redirect('dashboard')

@login_required
def update_bot_name(request):
    if request.method == 'POST':
