from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MetricViewSet, TradeGradeViewSet

router = DefaultRouter()
router.register(r'metrics', MetricViewSet)
router.register(r'grades', TradeGradeViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
