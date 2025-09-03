from django.db import models
from django.contrib.auth.models import User
from django.core.validators import FileExtensionValidator
from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver
import os
import logging

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

    Multi-image design:
      * One row per image (and its optional notes/title) for a given trade_id.
      * The previous single-image restriction (unique constraint on trade_id)
        was removed so users can attach an arbitrary number of images.
    We deliberately use trade_id int (points to Trades.ID) to avoid FK coupling
    across apps/migrations.
    """

    trade_id = models.IntegerField(db_index=True)
    title = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
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
        verbose_name = "Post Trade Analysis"
        verbose_name_plural = "Post Trade Analyses"

    def __str__(self):
        return f"PostAnalysis(trade={self.trade_id}, title={self.title or '—'})"


# --- Cleanup logic for orphaned images ---
logger = logging.getLogger(__name__)

def _cleanup_unreferenced_post_analysis_images():
    """Remove files in post_analysis_images/ not referenced by any PostTradeAnalysis.image.

    Runs after a new image is saved to prevent accumulation of orphan files.
    Safe-guards:
      * Only touches the upload_to directory (no recursion beyond it)
      * Skips if MEDIA_ROOT or directory missing
    """
    upload_subdir = 'post_analysis_images'
    base_dir = getattr(settings, 'MEDIA_ROOT', None)
    if not base_dir:
        return
    target_dir = os.path.join(base_dir, upload_subdir)
    if not os.path.isdir(target_dir):
        return

    # All referenced relative paths (e.g. 'post_analysis_images/filename.png')
    referenced = set(
        PostTradeAnalysis.objects.exclude(image='').values_list('image', flat=True)
    )
    # Normalize to forward slashes for consistency
    referenced_norm = {p.replace('\\', '/') for p in referenced}

    removed = 0
    try:
        for entry in os.listdir(target_dir):
            abs_path = os.path.join(target_dir, entry)
            if not os.path.isfile(abs_path):
                continue
            rel_path = f"{upload_subdir}/{entry}"  # matches ImageField stored path
            if rel_path not in referenced_norm:
                try:
                    os.remove(abs_path)
                    removed += 1
                except OSError as e:
                    logger.warning("Failed to delete orphan image %s: %s", abs_path, e)
    finally:
        if removed:
            logger.info("PostTradeAnalysis cleanup: removed %d orphan image(s)", removed)


@receiver(post_save, sender=PostTradeAnalysis)
def post_trade_analysis_image_cleanup(sender, instance, created, **kwargs):
    """Trigger cleanup after saving a new image.

    We run only when an instance has an image file and was newly created OR when an
    existing instance's image field is set (instance.image and instance.image.name).
    """
    # instance.image may be a FieldFile; ensure it has a name and isn't empty.
    if instance.image and getattr(instance.image, 'name', ''):
        _cleanup_unreferenced_post_analysis_images()

