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
        self.alarm_process = None
        self.alarm_stop_file = None
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

    def play_alarm(self):
        """Start alarm playback in a separate subprocess that can be killed immediately."""
        try:
            # Stop any existing alarm first
            self.request_stop_alarm()
            
            settings = AlarmSettings.get_settings()
            sound_path = self.get_alarm_sound_path()

            print(f"[MAIN] Starting alarm subprocess: {sound_path} ({settings.cycles} cycles)")
            logger.info(f"Starting alarm subprocess: {sound_path} ({settings.cycles} cycles)")
            
            # Create a unique stop file for this alarm instance
            import tempfile
            # Use mkstemp to get a file descriptor, then close it and delete it
            # This ensures we get a unique filename that doesn't exist yet
            fd, self.alarm_stop_file = tempfile.mkstemp(suffix=".stop")
            os.close(fd)
            os.unlink(self.alarm_stop_file)  # Delete it so it doesn't exist yet
            print(f"[MAIN] Stop file: {self.alarm_stop_file}")
            print(f"[MAIN] Stop file exists before start: {Path(self.alarm_stop_file).exists()}")
            
            # Get path to alarm_player.py
            alarm_player_path = Path(__file__).parent / "alarm_player.py"
            
            # Start the alarm as a completely separate Python subprocess
            # Use unbuffered output so we can see messages immediately
            self.alarm_process = subprocess.Popen(
                [
                    sys.executable,  # python.exe
                    "-u",  # Unbuffered output
                    str(alarm_player_path),
                    sound_path,
                    str(settings.play_duration),
                    str(settings.pause_duration),
                    str(settings.cycles),
                    self.alarm_stop_file,
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=0,  # No buffering
            )
            print(f"[MAIN] Alarm subprocess started with PID: {self.alarm_process.pid}")
            logger.info(f"Alarm subprocess started with PID: {self.alarm_process.pid}")
            
            # Start threads to read stdout and stderr
            def read_stdout():
                try:
                    if self.alarm_process.stdout:
                        for line in iter(self.alarm_process.stdout.readline, ''):
                            if line:
                                print(f"[SUBPROCESS OUT] {line.rstrip()}")
                except Exception as e:
                    print(f"[MAIN] Error reading stdout: {e}")
            
            def read_stderr():
                try:
                    if self.alarm_process.stderr:
                        for line in iter(self.alarm_process.stderr.readline, ''):
                            if line:
                                print(f"[SUBPROCESS ERR] {line.rstrip()}")
                except Exception as e:
                    print(f"[MAIN] Error reading stderr: {e}")
            
            stdout_thread = threading.Thread(target=read_stdout, daemon=True)
            stderr_thread = threading.Thread(target=read_stderr, daemon=True)
            stdout_thread.start()
            stderr_thread.start()

        except Exception as e:
            logger.error(f"Error starting alarm subprocess: {e}")
            print(f"[MAIN] Error starting alarm: {e}")

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

                # Start alarm in separate process
                self.play_alarm()
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
        """NUCLEAR OPTION: Signal stop file + forcefully kill the subprocess and all its children."""
        # Method 0: Signal the subprocess to stop gracefully via file
        if self.alarm_stop_file:
            try:
                print(f"[MAIN] Creating stop signal file: {self.alarm_stop_file}")
                Path(self.alarm_stop_file).touch()
            except Exception as e:
                print(f"[MAIN] Failed to create stop file: {e}")
        else:
            print("[MAIN] No stop file set — skipping graceful stop signal")
        
        if self.alarm_process and self.alarm_process.poll() is None:  # Process is still running
            pid = self.alarm_process.pid
            print(f"[MAIN] ☢️ NUCLEAR STOP - Killing subprocess PID {pid} and all children")
            logger.info(f"Stop alarm requested - killing subprocess PID {pid}")
            
            try:
                # Method 1: Windows-specific taskkill (NUCLEAR) - DO THIS FIRST
                if os.name == 'nt':
                    try:
                        print(f"[MAIN] Executing Windows taskkill /F /T on PID {pid}")
                        result = subprocess.run(
                            ['taskkill', '/F', '/T', '/PID', str(pid)],
                            capture_output=True,
                            timeout=2,
                            text=True
                        )
                        print(f"[MAIN] taskkill output: {result.stdout}")
                        print(f"[MAIN] taskkill stderr: {result.stderr}")
                    except Exception as e:
                        print(f"[MAIN] taskkill failed: {e}")
                
                # Method 2: Use psutil to kill the entire process tree
                try:
                    parent = psutil.Process(pid)
                    children = parent.children(recursive=True)
                    
                    # Kill all children first
                    for child in children:
                        try:
                            print(f"[MAIN] Killing child process PID {child.pid}")
                            child.kill()
                        except (psutil.NoSuchProcess, psutil.AccessDenied):
                            pass
                    
                    # Kill the parent
                    parent.kill()
                    print(f"[MAIN] Killed parent process PID {pid}")
                    
                    # Wait for termination
                    gone, alive = psutil.wait_procs([parent] + children, timeout=1)
                    
                    if alive:
                        print(f"[MAIN] ⚠️ Some processes still alive: {[p.pid for p in alive]}")
                        for p in alive:
                            try:
                                p.kill()
                            except:
                                pass
                                
                except (psutil.NoSuchProcess, psutil.AccessDenied) as e:
                    print(f"[MAIN] psutil method failed: {e}")
                
                # Method 3: Python's subprocess kill
                try:
                    self.alarm_process.kill()
                    self.alarm_process.wait(timeout=0.5)
                except:
                    pass
                
                # Method 4: Unix signal (if not Windows)
                if os.name != 'nt':
                    try:
                        os.kill(pid, signal.SIGKILL)
                    except:
                        pass
                
                print("[MAIN] ✅ Alarm subprocess terminated")
                logger.info("Alarm subprocess stopped")
                
            except Exception as e:
                logger.error(f"Error stopping alarm subprocess: {e}")
                print(f"[MAIN] ❌ Error stopping alarm: {e}")
            finally:
                self.alarm_process = None
        else:
            print("[MAIN] No running alarm_process reference — will scan for orphan alarm processes")
        
        # Method 5: Kill any orphan alarm_player.py processes we can still find
        self._kill_orphan_alarm_processes(ignore_pid=None)
        
        # Cleanup stop file
        if self.alarm_stop_file:
            try:
                if Path(self.alarm_stop_file).exists():
                    Path(self.alarm_stop_file).unlink()
                    print(f"[MAIN] Deleted stop file: {self.alarm_stop_file}")
            except Exception as e:
                print(f"[MAIN] Failed to delete stop file: {e}")
            self.alarm_stop_file = None

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


def stop_alarm_playback():
    print("[API] stop_alarm_playback called")
    monitor = get_monitor()
    print(f"[API] Monitor instance id: {id(monitor)}")
    monitor.request_stop_alarm()

