"""
Background service to monitor price alerts.
Inspired by ticker_data_fetcher: we keep a rotating list of tickers and update them round-robin.
"""
import logging
import os
import signal
import subprocess
import sys
import threading
import time
from pathlib import Path

import psutil
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
        # Track multiple independent alarms by alert_id
        self.alarm_processes = {}  # {alert_id: subprocess.Popen}
        self.alarm_stop_files = {}  # {alert_id: stop_file_path}
        self.lock = threading.Lock()

    # ---------- Alarm playback ----------
    def get_alarm_sound_path(self):
        settings = AlarmSettings.get_settings()
        sound_file = settings.alarm_sound_path
        base_dir = Path(__file__).resolve().parent.parent
        sound_path = Path(sound_file) if os.path.isabs(sound_file) else base_dir / "alarm_sounds" / sound_file

        if not sound_path.exists():
            logger.warning(f"Alarm sound not found: {sound_path}, using default")
            sound_path = base_dir / "alarm_sounds" / "alarm-clock-2.mp3"

        return str(sound_path)

    def play_alarm(self, alert_id):
        """Start alarm playback in a separate subprocess for a specific alert.
        
        Args:
            alert_id: Unique identifier for the alert triggering this alarm
        """
        try:
            # Stop any existing alarm for this specific alert
            self.request_stop_alarm(alert_id)
            
            settings = AlarmSettings.get_settings()
            sound_path = self.get_alarm_sound_path()

            print(f"[MAIN] ========== ALARM SETTINGS FOR ALERT {alert_id} ==========")
            print(f"[MAIN] Sound path: {sound_path}")
            print(f"[MAIN] Play duration: {settings.play_duration} seconds")
            print(f"[MAIN] Pause duration: {settings.pause_duration} seconds")
            print(f"[MAIN] Cycles: {settings.cycles}")
            print(f"[MAIN] ========================================================")
            logger.info(f"Starting alarm subprocess for alert {alert_id}: {sound_path} (play={settings.play_duration}s, pause={settings.pause_duration}s, cycles={settings.cycles})")
            
            # Create a unique stop file for this alarm instance
            import tempfile
            # Use mkstemp to get a file descriptor, then close it and delete it
            # This ensures we get a unique filename that doesn't exist yet
            fd, stop_file = tempfile.mkstemp(suffix=f".alert_{alert_id}.stop")
            os.close(fd)
            os.unlink(stop_file)  # Delete it so it doesn't exist yet
            print(f"[MAIN] Stop file for alert {alert_id}: {stop_file}")
            print(f"[MAIN] Stop file exists before start: {Path(stop_file).exists()}")
            
            # Get path to alarm_player.py
            alarm_player_path = Path(__file__).parent / "alarm_player.py"
            
            # Start the alarm as a completely separate Python subprocess
            # Use unbuffered output so we can see messages immediately
            alarm_process = subprocess.Popen(
                [
                    sys.executable,  # python.exe
                    "-u",  # Unbuffered output
                    str(alarm_player_path),
                    sound_path,
                    str(settings.play_duration),
                    str(settings.pause_duration),
                    str(settings.cycles),
                    stop_file,
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=0,  # No buffering
            )
            
            # Store the process and stop file for this alert
            with self.lock:
                self.alarm_processes[alert_id] = alarm_process
                self.alarm_stop_files[alert_id] = stop_file
            
            print(f"[MAIN] Alarm subprocess for alert {alert_id} started with PID: {alarm_process.pid}")
            logger.info(f"Alarm subprocess for alert {alert_id} started with PID: {alarm_process.pid}")
            
            # Start threads to read stdout and stderr
            def read_stdout():
                try:
                    if alarm_process.stdout:
                        for line in iter(alarm_process.stdout.readline, ''):
                            if line:
                                print(f"[SUBPROCESS {alert_id} OUT] {line.rstrip()}")
                except Exception as e:
                    print(f"[MAIN] Error reading stdout for alert {alert_id}: {e}")
            
            def read_stderr():
                try:
                    if alarm_process.stderr:
                        for line in iter(alarm_process.stderr.readline, ''):
                            if line:
                                print(f"[SUBPROCESS {alert_id} ERR] {line.rstrip()}")
                except Exception as e:
                    print(f"[MAIN] Error reading stderr for alert {alert_id}: {e}")
            
            stdout_thread = threading.Thread(target=read_stdout, daemon=True)
            stderr_thread = threading.Thread(target=read_stderr, daemon=True)
            stdout_thread.start()
            stderr_thread.start()

        except Exception as e:
            logger.error(f"Error starting alarm subprocess for alert {alert_id}: {e}")
            print(f"[MAIN] Error starting alarm for alert {alert_id}: {e}")

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

                trigger_msg = f"ALERT TRIGGERED: {alert.ticker} @ ${alert.alert_price:.2f} (current: ${current_price:.2f})"
                print("=" * 60)
                print(trigger_msg)
                print("=" * 60)
                logger.info(trigger_msg)

                # Start alarm in separate process with unique alert ID
                self.play_alarm(alert.id)
                
                # Send Telegram notification (fail-safe, non-blocking)
                try:
                    self._send_telegram_notification_if_enabled(alert, current_price)
                except Exception as telegram_error:
                    # CRITICAL: Never let Telegram errors break the alert system
                    logger.error(f"Telegram notification failed (non-critical): {telegram_error}")
                    # Alert and alarm continue working normally
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
    def request_stop_alarm(self, alert_id=None):
        """Stop alarm(s). If alert_id is provided, stops only that alarm. Otherwise stops all alarms.
        
        Args:
            alert_id: Optional alert ID. If provided, stops only that specific alarm.
                     If None, stops all running alarms.
        """
        if alert_id is not None:
            # Stop a specific alarm
            self._stop_single_alarm(alert_id)
        else:
            # Stop all alarms
            with self.lock:
                alert_ids = list(self.alarm_processes.keys())
            
            print(f"[MAIN] Stopping all alarms ({len(alert_ids)} active)")
            for aid in alert_ids:
                self._stop_single_alarm(aid)
        
        # Method 5: Kill any orphan alarm_player.py processes we can still find
        # This is a failsafe, run after attempting to stop known processes
        self._kill_orphan_alarm_processes(ignore_pid=None)
    
    def _stop_single_alarm(self, alert_id):
        """NUCLEAR OPTION: Signal stop file + forcefully kill the subprocess and all its children for a specific alert."""
        with self.lock:
            alarm_process = self.alarm_processes.get(alert_id)
            alarm_stop_file = self.alarm_stop_files.get(alert_id)
        
        # Method 0: Signal the subprocess to stop gracefully via file
        if alarm_stop_file:
            try:
                print(f"[MAIN] Creating stop signal file for alert {alert_id}: {alarm_stop_file}")
                Path(alarm_stop_file).touch()
            except Exception as e:
                print(f"[MAIN] Failed to create stop file for alert {alert_id}: {e}")
        else:
            print(f"[MAIN] No stop file set for alert {alert_id} — skipping graceful stop signal")
        
        if alarm_process and alarm_process.poll() is None:  # Process is still running
            pid = alarm_process.pid
            print(f"[MAIN] ☢️ NUCLEAR STOP - Killing subprocess PID {pid} for alert {alert_id}")
            logger.info(f"Stop alarm requested for alert {alert_id} - killing subprocess PID {pid}")
            
            try:
                # Method 1: Windows-specific taskkill (NUCLEAR) - DO THIS FIRST
                if os.name == 'nt':
                    try:
                        print(f"[MAIN] Executing Windows taskkill /F /T on PID {pid} for alert {alert_id}")
                        result = subprocess.run(
                            ['taskkill', '/F', '/T', '/PID', str(pid)],
                            capture_output=True,
                            timeout=2,
                            text=True
                        )
                        print(f"[MAIN] taskkill output for alert {alert_id}: {result.stdout}")
                        print(f"[MAIN] taskkill stderr for alert {alert_id}: {result.stderr}")
                    except Exception as e:
                        print(f"[MAIN] taskkill failed for alert {alert_id}: {e}")
                
                # Method 2: Use psutil to kill the entire process tree
                try:
                    parent = psutil.Process(pid)
                    children = parent.children(recursive=True)
                    
                    # Kill all children first
                    for child in children:
                        try:
                            print(f"[MAIN] Killing child process PID {child.pid} for alert {alert_id}")
                            child.kill()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass
                    
                    # Kill the parent
                    parent.kill()
                    print(f"[MAIN] Killed parent process PID {pid} for alert {alert_id}")
                    
                    # Wait for termination
                    gone, alive = psutil.wait_procs([parent] + children, timeout=1)
                    
                    if alive:
                        print(f"[MAIN] ⚠️ Some processes still alive for alert {alert_id}: {[p.pid for p in alive]}")
                        for p in alive:
                            try:
                                p.kill()
                            except:
                                pass
                                
                except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                    print(f"[MAIN] psutil method failed for alert {alert_id}: {e}")
                
                # Method 3: Python's subprocess kill
                try:
                    alarm_process.kill()
                    alarm_process.wait(timeout=0.5)
                except:
                    pass
                
                # Method 4: Unix signal (if not Windows)
                if os.name != 'nt':
                    try:
                        os.kill(pid, signal.SIGKILL)
                    except:
                        pass
                
                print(f"[MAIN] ✅ Alarm subprocess for alert {alert_id} terminated")
                logger.info(f"Alarm subprocess for alert {alert_id} stopped")
                
            except Exception as e:
                logger.error(f"Error stopping alarm subprocess for alert {alert_id}: {e}")
                print(f"[MAIN] ❌ Error stopping alarm for alert {alert_id}: {e}")
        else:
            print(f"[MAIN] No running alarm_process for alert {alert_id}")
        
        # Cleanup stop file
        if alarm_stop_file:
            try:
                if Path(alarm_stop_file).exists():
                    Path(alarm_stop_file).unlink()
                    print(f"[MAIN] Deleted stop file for alert {alert_id}: {alarm_stop_file}")
            except Exception as e:
                print(f"[MAIN] Failed to delete stop file for alert {alert_id}: {e}")
        
        # Remove from tracking dictionaries
        with self.lock:
            self.alarm_processes.pop(alert_id, None)
            self.alarm_stop_files.pop(alert_id, None)

    def _send_telegram_notification_if_enabled(self, alert, current_price):
        """
        Send Telegram notification if configured and enabled.
        This method is fail-safe and will never raise exceptions.
        
        Args:
            alert: Alert model instance that was triggered
            current_price: Current price that triggered the alert
        """
        try:
            # Lazy import to avoid breaking if model not migrated yet
            from .models import TelegramConfig
            from . import telegram_notifier
            
            # Get Telegram configuration
            try:
                config = TelegramConfig.get_config()
            except Exception as e:
                # Database might not be migrated yet, silently skip
                logger.debug(f"Could not load Telegram config: {e}")
                return
            
            # Check if Telegram is enabled and configured
            if not config.enabled:
                logger.debug("Telegram notifications disabled")
                return
            
            if not config.bot_token or not config.chat_id:
                logger.warning("Telegram enabled but not configured (missing token or chat_id)")
                return
            
            # Send notification
            logger.info(f"Sending Telegram notification for {alert.ticker}")
            success = telegram_notifier.send_telegram_alert(
                bot_token=config.bot_token,
                chat_id=config.chat_id,
                ticker=alert.ticker,
                alert_price=alert.alert_price,
                current_price=current_price
            )
            
            if success:
                logger.info(f"Telegram notification sent successfully for {alert.ticker}")
            else:
                logger.warning(f"Telegram notification failed for {alert.ticker}")
                
        except Exception as e:
            # Catch all exceptions to ensure alert system never breaks
            logger.error(f"Error in Telegram notification (non-critical): {e}", exc_info=True)

    def _kill_orphan_alarm_processes(self, ignore_pid):
        """Kill any alarm_player.py processes still running (failsafe)."""
        try:
            for proc in psutil.process_iter(["pid", "cmdline"]):
                pid = proc.info.get("pid")
                if pid == ignore_pid:
                    continue
                cmd = proc.info.get("cmdline") or []
                if any("price_alerts\\alarm_player.py" in arg or "price_alerts/alarm_player.py" in arg for arg in cmd):
                    print(f"[MAIN] Killing orphan alarm process PID {pid}")
                    try:
                        proc.kill()
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
        except Exception as e:
            print(f"[MAIN] Failed to scan/kill orphan alarm processes: {e}")

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
        self.request_stop_alarm()  # Stop any playing alarm
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


def stop_alarm_playback(alert_id=None):
    """Stop alarm playback for a specific alert or all alarms.
    
    Args:
        alert_id: Optional alert ID. If provided, stops only that alarm.
                 If None, stops all alarms.
    """
    if alert_id is not None:
        print(f"[API] stop_alarm_playback called for alert {alert_id}")
    else:
        print("[API] stop_alarm_playback called for ALL alarms")
    monitor = get_monitor()
    print(f"[API] Monitor instance id: {id(monitor)}")
    monitor.request_stop_alarm(alert_id)
