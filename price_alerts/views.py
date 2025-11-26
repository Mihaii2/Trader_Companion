import logging

from rest_framework import status, viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.utils import timezone
from .models import Alert, AlarmSettings
from .serializers import AlertSerializer, AlarmSettingsSerializer
from .monitor import stop_alarm_playback
import yfinance as yf

logger = logging.getLogger(__name__)


def _fetch_current_price(ticker: str):
    """Fetch current price for a ticker (same strategy as ticker_data_fetcher)."""
    try:
        ticker_obj = yf.Ticker(ticker)
        current_price = None

        try:
            info = ticker_obj.info
            current_price = info.get('currentPrice') or info.get('regularMarketPrice')
        except Exception as e:
            logger.debug(f"Failed to read info for {ticker}: {e}")

        if current_price is None:
            try:
                hist = ticker_obj.history(period="1d", interval="1m")
                if not hist.empty:
                    current_price = hist.iloc[-1]['Close']
            except Exception as e:
                logger.debug(f"Failed to read history for {ticker}: {e}")

        return float(current_price) if current_price is not None else None
    except Exception as e:
        logger.warning(f"Failed to fetch price for {ticker}: {e}")
        return None


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        ticker = serializer.validated_data['ticker'].upper()
        alert_price = serializer.validated_data['alert_price']

        current_price = _fetch_current_price(ticker)
        if current_price is None:
            return Response(
                {'error': f'Could not fetch price for {ticker}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        alert = serializer.save(
            ticker=ticker,
            current_price=current_price,
            initial_price_above_alert=current_price > alert_price,
            last_checked=timezone.now()
        )

        return Response(AlertSerializer(alert).data, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update alert and re-fetch price if needed"""
        instance = self.get_object()
        prev_is_active = instance.is_active
        prev_triggered = instance.triggered

        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        requested_is_active = serializer.validated_data.get('is_active')
        
        # If user is stopping the alert (setting is_active=False), handle it immediately
        if requested_is_active is False:
            if not prev_is_active:
                # Already stopped, just return current state
                return Response(AlertSerializer(instance).data)
            
            # Stop the alert - FORCE STOP ALARM IMMEDIATELY
            stop_alarm_playback()  # Stop alarm FIRST before saving
            instance.is_active = False
            instance.triggered = False
            instance.triggered_at = None
            instance.initial_price_above_alert = None
            instance.save(update_fields=['is_active', 'triggered', 'triggered_at', 'initial_price_above_alert'])
            # Stop again after save to be absolutely sure
            stop_alarm_playback()
            return Response(AlertSerializer(instance).data)
        
        # Prevent reactivation of stopped alerts
        if requested_is_active is True and not prev_is_active:
            return Response(
                {'error': 'Stopped alerts cannot be reactivated. Please create a new alert.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        alert = serializer.save()

        if alert.is_active and (not prev_is_active or prev_triggered or 'alert_price' in serializer.validated_data):
            # Only fetch price if alert is being reactivated or price changed
            current_price = _fetch_current_price(alert.ticker)
            if current_price is not None:
                alert.current_price = current_price
                alert.last_checked = timezone.now()
                alert.initial_price_above_alert = current_price > alert.alert_price
            else:
                alert.initial_price_above_alert = None
                alert.last_checked = timezone.now()
            alert.triggered = False
            alert.triggered_at = None
            alert.save(update_fields=[
                'current_price', 'last_checked', 'initial_price_above_alert',
                'triggered', 'triggered_at'
            ])
        elif not alert.is_active and prev_is_active:
            # Alert is being deactivated - stop fetching, keep last known price
            alert.triggered = False
            alert.triggered_at = None
            alert.initial_price_above_alert = None
            # Don't update current_price or last_checked - keep last known values
            alert.save(update_fields=['triggered', 'triggered_at', 'initial_price_above_alert'])
            stop_alarm_playback()
            alert.triggered = False
            alert.triggered_at = None
            alert.initial_price_above_alert = None
            alert.save(update_fields=['triggered', 'triggered_at', 'initial_price_above_alert'])
            stop_alarm_playback()

        return Response(AlertSerializer(alert).data)

    def destroy(self, request, *args, **kwargs):
        alert = self.get_object()
        response = super().destroy(request, *args, **kwargs)
        if alert.triggered or alert.is_active:
            stop_alarm_playback()
        return response


@api_view(['GET', 'PUT'])
def alarm_settings_view(request):
    """Get or update alarm settings"""
    settings_obj = AlarmSettings.get_settings()
    
    if request.method == 'GET':
        serializer = AlarmSettingsSerializer(settings_obj)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = AlarmSettingsSerializer(settings_obj, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
def upload_alarm_sound(request):
    """Upload a custom alarm sound file"""
    if 'file' not in request.FILES:
        return Response(
            {'error': 'No file provided'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    file = request.FILES['file']
    
    # Validate file type
    if not file.name.lower().endswith(('.mp3', '.wav', '.ogg', '.m4a')):
        return Response(
            {'error': 'Invalid file type. Only audio files (mp3, wav, ogg, m4a) are allowed.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Save file to alarm_sounds directory
    import os
    from django.conf import settings
    
    alarm_sounds_dir = os.path.join(settings.BASE_DIR, 'alarm_sounds')
    os.makedirs(alarm_sounds_dir, exist_ok=True)
    
    file_path = os.path.join(alarm_sounds_dir, file.name)
    
    with open(file_path, 'wb+') as destination:
        for chunk in file.chunks():
            destination.write(chunk)
    
    return Response({
        'message': 'File uploaded successfully',
        'filename': file.name,
        'path': file.name  # Just return filename, frontend will construct path
    })


@api_view(['GET'])
def list_alarm_sounds(request):
    """List all available alarm sound files"""
    import os
    from django.conf import settings
    
    alarm_sounds_dir = os.path.join(settings.BASE_DIR, 'alarm_sounds')
    sounds = []
    
    if os.path.exists(alarm_sounds_dir):
        for filename in os.listdir(alarm_sounds_dir):
            if filename.lower().endswith(('.mp3', '.wav', '.ogg', '.m4a')):
                sounds.append(filename)
    
    return Response({'sounds': sorted(sounds)})


@api_view(['GET'])
def serve_alarm_sound(request, filename):
    """Serve an alarm sound file"""
    import os
    from django.conf import settings
    from django.http import FileResponse, Http404
    from django.views.decorators.cache import cache_control
    
    alarm_sounds_dir = os.path.join(settings.BASE_DIR, 'alarm_sounds')
    file_path = os.path.join(alarm_sounds_dir, filename)
    
    # Security: ensure file is within the alarm_sounds directory
    if not os.path.abspath(file_path).startswith(os.path.abspath(alarm_sounds_dir)):
        raise Http404("Invalid file path")
    
    if not os.path.exists(file_path):
        raise Http404(f"Sound file not found: {filename}")
    
    # Determine content type
    content_type_map = {
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
    }
    ext = os.path.splitext(filename)[1].lower()
    content_type = content_type_map.get(ext, 'audio/mpeg')
    
    response = FileResponse(open(file_path, 'rb'), content_type=content_type)
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    # Enable CORS for audio files
    response['Access-Control-Allow-Origin'] = '*'
    response['Access-Control-Allow-Methods'] = 'GET'
    return response
