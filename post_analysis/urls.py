from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MetricViewSet, TradeGradeViewSet, PostTradeAnalysisViewSet

router = DefaultRouter()
router.register(r'metrics', MetricViewSet)
router.register(r'grades', TradeGradeViewSet)
router.register(r'analyses', PostTradeAnalysisViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
