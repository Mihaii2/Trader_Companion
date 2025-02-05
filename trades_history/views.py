from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from .models import Trades
from .serializers import TradesSerializer

class TradesViewSet(viewsets.ModelViewSet):
    queryset = Trades.objects.all()
    serializer_class = TradesSerializer