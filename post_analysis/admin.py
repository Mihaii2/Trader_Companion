from django.contrib import admin
from .models import Metric, MetricOption, TradeGrade


class MetricOptionInline(admin.TabularInline):
    model = MetricOption
    extra = 1


@admin.register(Metric)
class MetricAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'updated_at']
    search_fields = ['name']
    inlines = [MetricOptionInline]


@admin.register(TradeGrade)
class TradeGradeAdmin(admin.ModelAdmin):
    list_display = ['trade_id', 'metric', 'selected_option', 'graded_at']
    list_filter = ['metric', 'graded_at']
    search_fields = ['trade_id']

