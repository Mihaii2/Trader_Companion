from django.db import models
import json


class RankingBox(models.Model):
    title = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class GlobalCharacteristic(models.Model):
    name = models.CharField(max_length=100, unique=True)
    default_score = models.DecimalField(max_digits=5, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (Default: {self.default_score})"


class StockPick(models.Model):
    ranking_box = models.ForeignKey(RankingBox, on_delete=models.CASCADE, related_name='stock_picks')
    symbol = models.CharField(max_length=10)  # Stock symbol/ticker
    total_score = models.DecimalField(max_digits=5, decimal_places=2)
    case_text = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    characteristics = models.ManyToManyField(
        GlobalCharacteristic,
        through='StockPickCharacteristic',
        related_name='stock_picks'
    )

    def __str__(self):
        return f"{self.symbol} (Score: {self.total_score})"


class StockPickCharacteristic(models.Model):
    stockpick = models.ForeignKey(StockPick, on_delete=models.CASCADE, related_name='stock_characteristics')
    characteristic = models.ForeignKey(GlobalCharacteristic, on_delete=models.CASCADE, related_name='stock_assignments')
    score = models.DecimalField(max_digits=5, decimal_places=2)

    def __str__(self):
        return f"{self.stockpick.symbol} - {self.characteristic.name}: {self.score}"

    class Meta:
        unique_together = ['stockpick', 'characteristic']


class UserPageState(models.Model):
    column_count = models.IntegerField(default=3)
    ranking_boxes_order = models.TextField(default='[]')  # Stores JSON array of ranking box IDs
    updated_at = models.DateTimeField(auto_now=True)

    def set_ranking_boxes_order(self, order_list):
        """Store the list of ranking box IDs as a JSON string"""
        self.ranking_boxes_order = json.dumps(order_list)

    def get_ranking_boxes_order(self):
        """Retrieve the list of ranking box IDs"""
        return json.loads(self.ranking_boxes_order)

    def __str__(self):
        return f"UserPageState (Columns: {self.column_count})"