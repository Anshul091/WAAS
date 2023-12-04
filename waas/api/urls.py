from django.urls import path
from . import views

urlpatterns = [
    path('login/<str:id>', views.login, name='api_login'),
    path('logout/<str:id>', views.logout, name='api_logout'),
    path('status/', views.status, name='api_status'),
    path('status/<str:id>', views.status, name='api_status'),
    path('encode_qr_code', views.encode_qr_code, name='api_encode_qr_code'),
    path('checkmobilenumber/<str:id>/<int:mobile>', views.checkmobilenumber, name='checkmobilenumber'),
    path('getgrouptags/', views.getgrouptags, name='getgrouptags'),
]
