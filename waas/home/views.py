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
        bot_name = request.POST['bot_name']
        bot_id = request.POST['bot_id']
        if Bot.objects.filter(name=bot_name, username=request.user.username).exists():
            bot = Bot.objects.filter(id = bot_id)
            prev_name = bot.values_list('name', flat=True)[0]
            messages.error(request, 'This Bot name already exists')
            return redirect(f'/bot/{prev_name}')
        bot = Bot.objects.get(id=bot_id)
        bot.name = bot_name
        bot.save()
        return redirect(f'/bot/{bot_name}')
    else:
        return redirect('dashboard')

@login_required
def delete_bot(request):
    if request.method == 'POST':
        bot_id = request.POST['bot-id']
        bot = Bot.objects.get(id=bot_id)
        bot.delete()
        botmessage = BotMessage.objects.filter(botid=bot_id)
        botmessage.delete()
        bottags = GroupTag.objects.filter(botid=bot_id)
        bottags.delete()
        
        
        # Delete the sessions of the bot
        parent_dir = Path(settings.BASE_DIR).parent.absolute()
        session_dir = os.path.join(parent_dir, '.wwebjs_auth', f'session-{bot_id}')
        try:
            shutil.rmtree(session_dir)  # Delete the session directory tree
            os.rmdir(session_dir)  # Delete the session directory
        except:
            pass
        return redirect('dashboard')
    else:
        return redirect('dashboard')

@login_required
def bot(request, name):
    username = request.user.username
    try:
        bot = Bot.objects.get(name=name, username=username)
        print(bot)
        return render(request, 'home/bot.html', {'bot': bot, 'HOST_URL': HOST_URL})
    except:
        messages.error(request, 'Bot not found')
        return redirect('dashboard')


def test(request):
    bots = Bot.objects.all()
    for bot in bots:
        print(bot.id, bot.username, bot.name)
    return render(request, 'home/test.html', {'HOST_URL': HOST_URL})






@login_required
def group(request, groupid):
    grouplogs = GroupLog.objects.filter(chatid=groupid).order_by('-timestamp')
    botid = request.GET['botid']
    try:
        group = grouplogs[0]
    except:
        return HttpResponse('Group not found')
    group_msg = BotMessage.objects.filter(chatid=groupid, botid=botid).order_by('-timestamp')
    groupparticipant = {}
    member_activity = {}
    
    for i in range(len(grouplogs)-1):
        todayGroups = grouplogs[i]
        yesterdayGroups = grouplogs[i+1]
        date = todayGroups.timestamp.date()
        member_activity[f'{date}'] = [0, 0, 0]
        #Joined condition
        for participant in todayGroups.participants.split(','):
            if participant not in yesterdayGroups.participants.split(','):
                member_activity[f'{date}'][0] += 1
                if participant in groupparticipant:
                    if groupparticipant[f'{participant}'][0] == '.':
                        groupparticipant[f'{participant}'] = [todayGroups.timestamp.date(), groupparticipant[f'{participant}'][1]]
                else:
                    groupparticipant[f'{participant}'] = [todayGroups.timestamp.date(), '.']    
        for participant in yesterdayGroups.participants.split(','):
            if participant not in todayGroups.participants.split(','):
                member_activity[f'{date}'][1] += 1
                if participant in groupparticipant:
                    groupparticipant[f'{participant}'] = [groupparticipant[f'{participant}'][0], todayGroups.timestamp.date()]
                else:
                    groupparticipant[f'{participant}'] = ['.', todayGroups.timestamp.date()]
        member_activity[f'{date}'][2] = member_activity[f'{date}'][0] - member_activity[f'{date}'][1]
    
    print(member_activity)
    

    
    response = {
        'group': group,         # grouplog of latest timestamp (GroupLog)
        'group_msg': group_msg, # All messages of the group (BotMessage)
        'grouplogs': grouplogs, # List of groups (GroupLog)
        'groupparticipant': groupparticipant, # Dictionary of group participant activity (dict)
