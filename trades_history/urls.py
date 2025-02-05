from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TradesViewSet

router = DefaultRouter()
router.register(r'trades', TradesViewSet)

urlpatterns = [
    path('', include(router.urls)),
]