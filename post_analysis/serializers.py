from rest_framework import serializers
from .models import Metric, MetricOption, TradeGrade, PostTradeAnalysis


class MetricOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetricOption
        fields = ['id', 'name', 'value']


class MetricSerializer(serializers.ModelSerializer):
    options = MetricOptionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Metric
        fields = ['id', 'name', 'description', 'options', 'created_at', 'updated_at']


class CreateMetricSerializer(serializers.ModelSerializer):
    """Serializer for creating metrics with options"""
    options = serializers.ListField(
        child=serializers.CharField(max_length=100),
        write_only=True,
        required=False
    )
    
    class Meta:
        model = Metric
        fields = ['name', 'description', 'options']
        
    def create(self, validated_data):
        options_data = validated_data.pop('options', [])
        metric = Metric.objects.create(**validated_data)
        
        for i, option_name in enumerate(options_data):
            MetricOption.objects.create(
                metric=metric,
                name=option_name,
                value=i  # Use index as default value for ordering
            )
            
        return metric


class TradeGradeSerializer(serializers.ModelSerializer):
    class Meta:
        model = TradeGrade
        fields = ['id', 'trade_id', 'metric', 'selected_option', 'graded_at']
        
    def to_representation(self, instance):
        """Convert to frontend format"""
        return {
            'tradeId': instance.trade_id,
            'metricId': str(instance.metric.id),
            'selectedOptionId': str(instance.selected_option.id)
        }


class BulkTradeGradeSerializer(serializers.Serializer):
    """Serializer for bulk updating trade grades"""
    grades = serializers.ListField(
        child=serializers.DictField(
            child=serializers.CharField()
        )
    )
    deletions = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        required=False,
        allow_empty=True
    )
    
    def validate_grades(self, value):
        """Validate each grade entry"""
        for grade in value:
            if not all(key in grade for key in ['tradeId', 'metricId', 'selectedOptionId']):
                raise serializers.ValidationError(
                    "Each grade must contain tradeId, metricId, and selectedOptionId"
                )
        return value


class PostTradeAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostTradeAnalysis
        fields = [
            'id', 'trade_id', 'title', 'notes', 'image', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Provide absolute URL if request in context
        request = self.context.get('request')
        if instance.image and request:
            data['image'] = request.build_absolute_uri(instance.image.url)
        return data

    def validate_deletions(self, value):
        for deletion in value:
            if not all(key in deletion for key in ['tradeId', 'metricId']):
                raise serializers.ValidationError(
                    "Each deletion must contain tradeId and metricId"
                )
        return value
