# views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from personal_ranking_list_app.models import UserPageState, StockCharacteristic, StockPick, RankingBox
from personal_ranking_list_app.serializers import UserPageStateSerializer, StockCharacteristicSerializer, \
    StockPickSerializer, RankingBoxSerializer


class RankingBoxViewSet(viewsets.ModelViewSet):
    queryset = RankingBox.objects.all()
    serializer_class = RankingBoxSerializer

    @action(detail=True, methods=['get'])
    def stock_picks(self, request, pk=None):
        ranking_box = self.get_object()
        stock_picks = ranking_box.stock_picks.all()
        serializer = StockPickSerializer(stock_picks, many=True)
        return Response(serializer.data)

class StockPickViewSet(viewsets.ModelViewSet):
    queryset = StockPick.objects.all()
    serializer_class = StockPickSerializer

    def get_queryset(self):
        queryset = StockPick.objects.all()
        ranking_box_id = self.request.query_params.get('ranking_box', None)
        if ranking_box_id is not None:
            queryset = queryset.filter(ranking_box_id=ranking_box_id)
        return queryset

    def create(self, request, *args, **kwargs):
        if 'ranking_box' not in request.data:
            return Response(
                {"ranking_box": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

class StockCharacteristicViewSet(viewsets.ModelViewSet):
    queryset = StockCharacteristic.objects.all()
    serializer_class = StockCharacteristicSerializer

    def get_queryset(self):
        queryset = StockCharacteristic.objects.all()
        stock_pick_id = self.request.query_params.get('stock_pick', None)
        if stock_pick_id is not None:
            queryset = queryset.filter(stock_pick_id=stock_pick_id)
        return queryset

    def create(self, request, *args, **kwargs):
        if 'stock_pick' not in request.data:
            return Response(
                {"stock_pick": ["This field is required."]},
                status=status.HTTP_400_BAD_REQUEST
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
            headers=headers
        )

class UserPageStateViewSet(viewsets.ModelViewSet):
    queryset = UserPageState.objects.all()
    serializer_class = UserPageStateSerializer

    def get_object(self):
        obj, created = UserPageState.objects.get_or_create(
            pk=1,
            defaults={
                'column_count': 3,
                'ranking_boxes_order': '[]'
            }
        )
        return obj

    def list(self, request):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)