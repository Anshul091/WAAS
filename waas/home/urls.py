from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='home'),
    path('login/', views.login, name='login'),
    path('logout/', views.logout, name='logout'),
    path('signup/', views.signup, name='signup'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('addbot/', views.addbot, name='addbot'),
    path('bot/<str:name>/', views.bot, name='bot'),
    path('test/', views.test, name='test'),
    path('update_bot_name/', views.update_bot_name, name='update_bot_name'),
    path('delete_bot/', views.delete_bot, name='delete_bot'),
    path('group/<str:groupid>/', views.group, name='group'),
    path('addtag/', views.addtag, name='addtag'),
    path('update_bot_type/', views.update_bot_type, name='update_bot_type'),
]
