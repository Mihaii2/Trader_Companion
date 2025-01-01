# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'ranking-boxes', views.RankingBoxViewSet)
router.register(r'stock-picks', views.StockPickViewSet)
router.register(r'stock-characteristics', views.StockCharacteristicViewSet)
router.register(r'user-page-state', views.UserPageStateViewSet)

urlpatterns = [
    path('', include(router.urls)),
]