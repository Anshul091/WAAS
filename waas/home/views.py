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
