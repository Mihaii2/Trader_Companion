"""
Background service to monitor price alerts.
Inspired by ticker_data_fetcher: we keep a rotating list of tickers and update them round-robin.
"""
import logging
import os
import threading
import time
from pathlib import Path

import pygame
import yfinance as yf
from django.db import close_old_connections
from django.utils import timezone

from .models import Alert, AlarmSettings

logger = logging.getLogger(__name__)


class PriceAlertMonitor:
    """Monitors price alerts by cycling through tickers and updating their prices."""

    def __init__(self):
        self.running = False
        self.monitor_thread = None
        self.ticker_list = []
        self.ticker_index = 0
        self.ticker_refresh_interval = 30  # seconds
        self.last_ticker_refresh = 0.0
        self.request_interval = 1.0  # seconds between ticker requests (imitates ticker_data_fetcher)
        self.idle_sleep = 5
        self.pygame_initialized = False
        self.alarm_stop_event = threading.Event()
        self.lock = threading.Lock()

    # ---------- Alarm playback ----------
    def initialize_audio(self):
        if not self.pygame_initialized:
            try:
                pygame.mixer.init()
                self.pygame_initialized = True
                logger.info("Audio system initialized")
            except Exception as e:
                logger.error(f"Failed to initialize audio: {e}")
                self.pygame_initialized = False

    def get_alarm_sound_path(self):
        settings = AlarmSettings.get_settings()
        sound_file = settings.alarm_sound_path
        base_dir = Path(__file__).resolve().parent.parent
        sound_path = Path(sound_file) if os.path.isabs(sound_file) else base_dir / "alarm_sounds" / sound_file

        if not sound_path.exists():
            logger.warning(f"Alarm sound not found: {sound_path}, using default")
            sound_path = base_dir / "alarm_sounds" / "alarm-clock-2.mp3"

        return str(sound_path)

    def play_alarm(self):
        try:
            self.initialize_audio()
            if not self.pygame_initialized:
                logger.error("Audio system not initialized, cannot play alarm")
                return

            settings = AlarmSettings.get_settings()
            sound_path = self.get_alarm_sound_path()

            logger.info(f"Playing alarm: {sound_path} ({settings.cycles} cycles)")
            self.alarm_stop_event.clear()

            for cycle in range(settings.cycles):
                if self.alarm_stop_event.is_set():
                    logger.info("Alarm stopped by user")
                    pygame.mixer.music.stop()
                    return

                try:
                    pygame.mixer.music.load(sound_path)
                    pygame.mixer.music.play()

                    start_time = time.time()
                    while pygame.mixer.music.get_busy() and (time.time() - start_time) < settings.play_duration:
                        if self.alarm_stop_event.is_set():
                            logger.info("Alarm stopped during playback")
                            pygame.mixer.music.stop()
                            return
                        time.sleep(0.05)

                    # Stop before pause
                    pygame.mixer.music.stop()
                    
                    # Check stop event before pause
                    if self.alarm_stop_event.is_set():
                        logger.info("Alarm stopped before pause")
                        return

                    if cycle < settings.cycles - 1:
                        pause_end = time.time() + settings.pause_duration
                        while time.time() < pause_end:
                            if self.alarm_stop_event.is_set():
                                logger.info("Alarm stopped during pause")
                                return
                            time.sleep(0.05)  # Check more frequently

                except Exception as e:
                    logger.error(f"Error playing alarm cycle {cycle + 1}: {e}")
                    if self.alarm_stop_event.is_set():
                        pygame.mixer.music.stop()
                        return

        except Exception as e:
            logger.error(f"Error in play_alarm: {e}")
        finally:
            # Ensure music is stopped
            try:
                pygame.mixer.music.stop()
            except Exception:
                pass

    # ---------- Data fetching ----------
    def refresh_ticker_list(self):
        """Load distinct tickers that have active alerts.
        
        Deduplicates tickers so we only fetch once per ticker per cycle,
        even if multiple alerts exist for the same symbol.
        """
        active_tickers = list(
            Alert.objects.filter(is_active=True, triggered=False)
            .values_list("ticker", flat=True)
            .distinct()  # Database-level deduplication
        )
        active_tickers = sorted({ticker.upper().strip() for ticker in active_tickers if ticker})  # Python-level deduplication

        with self.lock:
            self.ticker_list = active_tickers
            self.ticker_index = 0

        logger.info(f"Refreshed ticker list: {self.ticker_list}")

    def get_next_ticker(self):
        with self.lock:
            if not self.ticker_list:
                return None
            ticker = self.ticker_list[self.ticker_index]
            self.ticker_index = (self.ticker_index + 1) % len(self.ticker_list)
            return ticker

    def fetch_price(self, ticker):
        """Fetch current price similar to ticker_data_fetcher (info -> history fallback)."""
        try:
            ticker_obj = yf.Ticker(ticker)
            current_price = None

            try:
                info = ticker_obj.info
                current_price = info.get("currentPrice") or info.get("regularMarketPrice")
            except Exception as e:
                logger.debug(f"Could not get info for {ticker}: {e}")

            if current_price is None:
                try:
                    hist = ticker_obj.history(period="1d", interval="1m")
                    if not hist.empty:
                        current_price = float(hist.iloc[-1]["Close"])
                except Exception as e:
                    logger.debug(f"Could not get history for {ticker}: {e}")

            if current_price is None:
                logger.warning(f"No price data available for {ticker}")
                return None

            return float(current_price)

        except Exception as e:
            logger.error(f"Error fetching price for {ticker}: {e}")
            return None

    def update_alerts_for_ticker(self, ticker, current_price):
        """Update all alerts for a ticker, trigger alarms if thresholds crossed."""
        alerts = Alert.objects.filter(ticker=ticker, is_active=True, triggered=False)
        if not alerts.exists():
            return

        for alert in alerts:
            should_trigger = False
            now = timezone.now()

            if alert.initial_price_above_alert is None:
                alert.initial_price_above_alert = current_price > alert.alert_price

            if alert.initial_price_above_alert:
                should_trigger = current_price <= alert.alert_price
            else:
                should_trigger = current_price >= alert.alert_price

            alert.current_price = current_price
            alert.last_checked = now

            if should_trigger:
                alert.triggered = True
                alert.triggered_at = now
                alert.save(
                    update_fields=[
                        "current_price",
                        "last_checked",
                        "initial_price_above_alert",
                        "triggered",
                        "triggered_at",
                    ]
                )

                trigger_msg = f"🚨 ALERT TRIGGERED: {alert.ticker} @ ${alert.alert_price:.2f} (current: ${current_price:.2f})"
                print("=" * 60)
                print(trigger_msg)
                print("=" * 60)
                logger.info(trigger_msg)

                alarm_thread = threading.Thread(target=self.play_alarm, daemon=True)
                alarm_thread.start()
            else:
                alert.save(
                    update_fields=[
                        "current_price",
                        "last_checked",
                        "initial_price_above_alert",
                    ]
                )

    # ---------- Monitor loop ----------
    def monitor_loop(self):
        logger.info("Price alert monitor loop started")
        print("Price alert monitor loop started - cycling through tickers like ticker_data_fetcher.")

        while self.running:
            try:
                close_old_connections()

                now = time.time()
                if now - self.last_ticker_refresh >= self.ticker_refresh_interval:
                    self.refresh_ticker_list()
                    self.last_ticker_refresh = now

                ticker = self.get_next_ticker()

                if not ticker:
                    time.sleep(self.idle_sleep)
                    continue

                current_price = self.fetch_price(ticker)
                if current_price is not None:
                    self.update_alerts_for_ticker(ticker, current_price)

                time.sleep(self.request_interval)

            except Exception as e:
                logger.error(f"Error in monitor loop: {e}", exc_info=True)
                time.sleep(self.idle_sleep)

    # ---------- Control ----------
    def request_stop_alarm(self):
        """Immediately stop any playing alarm."""
        logger.info("Stop alarm requested")
        self.alarm_stop_event.set()
        if self.pygame_initialized:
            try:
                pygame.mixer.music.stop()
                # Force stop by unloading
                pygame.mixer.music.unload()
            except Exception as e:
                logger.debug(f"Error stopping alarm: {e}")

    def start(self):
        if self.running:
            logger.warning("Monitor is already running")
            return

        self.running = True
        self.monitor_thread = threading.Thread(target=self.monitor_loop, daemon=True, name="PriceAlertMonitor")
        self.monitor_thread.start()
        logger.info("Price alert monitor started")

    def stop(self):
        self.running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("Price alert monitor stopped")


_monitor_instance = None


def get_monitor():
    global _monitor_instance
    if _monitor_instance is None:
        _monitor_instance = PriceAlertMonitor()
    return _monitor_instance


def start_monitoring():
    monitor = get_monitor()
    monitor.start()


def stop_monitoring():
    monitor = get_monitor()
    monitor.stop()


def stop_alarm_playback():
    monitor = get_monitor()
    monitor.request_stop_alarm()

