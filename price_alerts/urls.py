from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'alerts', views.AlertViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('alarm-settings/', views.alarm_settings_view, name='alarm-settings'),
    path('upload-alarm-sound/', views.upload_alarm_sound, name='upload-alarm-sound'),
    path('list-alarm-sounds/', views.list_alarm_sounds, name='list-alarm-sounds'),
    path('alarm-sounds/<str:filename>', views.serve_alarm_sound, name='serve-alarm-sound'),
    path('stop-alarm/', views.stop_alarm_view, name='stop-all-alarms'),  # Stop all alarms
    path('stop-alarm/<int:alert_id>/', views.stop_alarm_view, name='stop-alarm'),  # Stop specific alarm
]
