# serializers.py
import json

from rest_framework import serializers
from .models import RankingBox, StockPick, StockCharacteristic, UserPageState


class StockCharacteristicSerializer(serializers.ModelSerializer):
    score = serializers.FloatField()  # Explicitly define as FloatField

    class Meta:
        model = StockCharacteristic
        fields = ['id', 'stock_pick', 'name', 'description', 'score', 'created_at']


class StockPickSerializer(serializers.ModelSerializer):
    characteristics = StockCharacteristicSerializer(many=True, read_only=True)
    ranking_box = serializers.PrimaryKeyRelatedField(queryset=RankingBox.objects.all())
    total_score = serializers.FloatField()  # Explicitly define as FloatField
    case_text = serializers.CharField(required=False, allow_blank=True)  # Add this line

    class Meta:
        model = StockPick
        fields = ['id', 'ranking_box', 'symbol', 'total_score', 'case_text', 'created_at', 'characteristics']  # Add case_text to fields


class RankingBoxSerializer(serializers.ModelSerializer):
    stock_picks = StockPickSerializer(many=True, read_only=True)

    class Meta:
        model = RankingBox
        fields = ['id', 'title', 'created_at', 'stock_picks']


class UserPageStateSerializer(serializers.ModelSerializer):
    ranking_boxes_order = serializers.JSONField(required=False)

    class Meta:
        model = UserPageState
        fields = ['id', 'column_count', 'ranking_boxes_order', 'updated_at']

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        try:
            if isinstance(ret['ranking_boxes_order'], str):
                ret['ranking_boxes_order'] = json.loads(ret['ranking_boxes_order'])
            if not isinstance(ret['ranking_boxes_order'], list):
                ret['ranking_boxes_order'] = []
        except (json.JSONDecodeError, TypeError):
            ret['ranking_boxes_order'] = []
        return ret

    def to_internal_value(self, data):
        if 'ranking_boxes_order' in data:
            if isinstance(data['ranking_boxes_order'], list):
                data = data.copy()
                data['ranking_boxes_order'] = json.dumps(data['ranking_boxes_order'])
            elif isinstance(data['ranking_boxes_order'], str):
                try:
                    json.loads(data['ranking_boxes_order'])
                except json.JSONDecodeError:
                    raise serializers.ValidationError({
                        'ranking_boxes_order': ['Invalid JSON format']
                    })
        return super().to_internal_value(data)