from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator

class Metric(models.Model):
    """Custom metrics for grading trades"""
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        
    def __str__(self):
        return self.name


class MetricOption(models.Model):
    """Options for each metric"""
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE, related_name='options')
    name = models.CharField(max_length=100)
    value = models.IntegerField(default=0)  # For scoring/ordering if needed
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['value', 'name']
        unique_together = ['metric', 'name']
        
    def __str__(self):
        return f"{self.metric.name} - {self.name}"


class TradeGrade(models.Model):
    """Grades assigned to trades based on metrics
    
    Note: trade_id references the Trade model from your existing trades_app
    We don't use a ForeignKey to avoid tight coupling between apps
    """
    trade_id = models.IntegerField()  # References Trade.ID from trades_app
    metric = models.ForeignKey(Metric, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(MetricOption, on_delete=models.CASCADE)
    graded_at = models.DateTimeField(auto_now_add=True)
    graded_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    
    class Meta:
        unique_together = ['trade_id', 'metric']
        indexes = [
            models.Index(fields=['trade_id']),
            models.Index(fields=['metric']),
        ]
        
    def __str__(self):
        return f"Trade {self.trade_id} - {self.metric.name}: {self.selected_option.name}"


class PostTradeAnalysis(models.Model):
    """Stores supplementary post-trade analysis artifacts (images, notes).

    We deliberately use trade_id int (points to Trades.ID) to avoid FK coupling
    across apps/migrations.
    """
    trade_id = models.IntegerField(db_index=True)
    # optional short title in case of multiple images later
    title = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    # single image for now; if multiple images desired, create separate rows per image
    image = models.ImageField(
        upload_to="post_analysis_images/",
        null=True,
        blank=True,
        validators=[FileExtensionValidator(["png", "jpg", "jpeg", "gif"])]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [models.Index(fields=["trade_id"])]
        constraints = [
            models.UniqueConstraint(fields=["trade_id"], name="uniq_post_analysis_trade")
        ]
        verbose_name = "Post Trade Analysis"
        verbose_name_plural = "Post Trade Analyses"

    def __str__(self):
        return f"PostAnalysis(trade={self.trade_id}, title={self.title or '—'})"

