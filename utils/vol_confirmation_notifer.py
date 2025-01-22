import yfinance as yf
from datetime import datetime, timedelta
import pandas as pd
from pushbullet import Pushbullet
import time
import sys
import argparse
from typing import Set, Dict
import threading
from zoneinfo import ZoneInfo
from datetime import datetime, timedelta
from datetime import time as datetime_time


def send_notification(title: str, message: str, pb_api_key: str) -> bool:
    print(f"\nAttempting to send notification: {title}")
    pb = Pushbullet(pb_api_key)
    push = pb.push_note(title, message)
    push_id = push['iden']

    print("Waiting to verify delivery...")
    time.sleep(2)
    pushes = pb.get_pushes()
    for p in pushes:
        if p['iden'] == push_id and p['dismissed'] is False:
            print("✓ Notification delivered successfully")
            return True
    print("✗ Notification delivery could not be verified")
    return False


def get_market_time() -> datetime:
    """Get the current time in US/Eastern (market time)"""
    return datetime.now(ZoneInfo("America/New_York"))


def is_market_open(dt: datetime = None) -> bool:
    if dt is None:
        dt = get_market_time()

    # Check if it's a weekday
    if dt.weekday() >= 5:  # Saturday = 5, Sunday = 6
        return False

    # Market hours are 9:30 AM - 4:00 PM Eastern
    market_open = datetime_time(9, 30)
    market_close = datetime_time(16, 0)
    current_time = dt.time()

    return market_open <= current_time <= market_close


def check_volume_confirmation(ticker: str, lookback_days: int = 14, volume_multiplier: float = 1.5) -> tuple[
    bool, float, list[float]]:
    print(f"\nChecking volume confirmation for {ticker}...")

    # Get current market time
    market_now = get_market_time()
    print(f"Current market time: {market_now.strftime('%Y-%m-%d %H:%M:%S %Z')}")

    if not is_market_open(market_now):
        print("⚠ Market is currently closed")

    print(f"Downloading data for {ticker}...")
    ticker_obj = yf.Ticker(ticker)

    try:
        # Get data in two 7-day chunks
        dfs = []
        for i in range(0, lookback_days, 7):
            chunk_end = market_now - timedelta(days=i)
            chunk_start = max(chunk_end - timedelta(days=7), market_now - timedelta(days=lookback_days))
            print(
                f"Downloading chunk {i // 7 + 1}: {chunk_start.strftime('%Y-%m-%d')} to {chunk_end.strftime('%Y-%m-%d')}")
            chunk_df = ticker_obj.history(start=chunk_start, end=chunk_end, interval='5m')
            dfs.append(chunk_df)

        # Combine the chunks
        df = pd.concat(dfs)

        if df.empty:
            print(f"✗ No data available for {ticker}")
            return False, 0, []

        # Convert index to Eastern time and extract components
        df.index = df.index.tz_convert('America/New_York')
        df['Date'] = df.index.date
        df['Time'] = df.index.time

        current_date = market_now.date()
        current_time = market_now.time()

        # Calculate current day's volume up to current time
        current_partial_volume = df[
            (df['Date'] == current_date) &
            (df['Time'] <= current_time)
            ]['Volume'].sum()

        print(f"\n{ticker} current volume at {current_time.strftime('%H:%M')} ET: {current_partial_volume:,.0f}")

        # Get previous trading days' volumes
        previous_volumes = []  # Volumes up to current time
        previous_full_volumes = []  # Full day volumes
        trading_days = 0
        days_back = 1

        while trading_days < lookback_days and days_back < 14:  # Now looking back up to 14 days
            prev_date = current_date - timedelta(days=days_back)

            # Skip weekends
            if prev_date.weekday() < 5:
                # Get volume up to current time
                prev_volume = df[
                    (df['Date'] == prev_date) &
                    (df['Time'] <= current_time)
                    ]['Volume'].sum()

                # Get full day volume
                full_day_volume = df[df['Date'] == prev_date]['Volume'].sum()

                # Only count days with actual trading data
                if full_day_volume > 0:
                    print(f"\n{ticker} {trading_days + 1} trading day(s) ago ({prev_date.strftime('%Y-%m-%d')}):")
                    print(f"  - Volume at {current_time.strftime('%H:%M')}: {prev_volume:,.0f}")
                    print(f"  - Full day volume:   {full_day_volume:,.0f}")
                    print(f"  - % of day complete: {(prev_volume / full_day_volume * 100):.1f}%")
                    previous_volumes.append(prev_volume)
                    previous_full_volumes.append(full_day_volume)
                    trading_days += 1
            days_back += 1

        if len(previous_volumes) < 3:
            print(f"\n✗ Not enough trading days with data for {ticker}")
            return False, 0, []

        max_previous_volume = max(previous_volumes) if previous_volumes else 0
        volume_threshold = max_previous_volume * volume_multiplier
        has_confirmation = current_partial_volume > volume_threshold

        print(f"\nSummary for {ticker}:")
        print(f"Current volume at {current_time.strftime('%H:%M')} ET: {current_partial_volume:,.0f}")
        print(f"Previous {len(previous_volumes)} day max volume at same time: {max_previous_volume:,.0f}")
        print(f"Volume threshold ({volume_multiplier}x previous max): {volume_threshold:,.0f}")
        print(f"Previous {len(previous_full_volumes)} day max FULL DAY volume: {max(previous_full_volumes):,.0f}")

        if has_confirmation:
            print(f"\n✓ {ticker} HAS volume confirmation!")
        else:
            print(f"\n✗ {ticker} does not have volume confirmation")

        return has_confirmation, current_partial_volume, previous_volumes

    except Exception as e:
        print(f"✗ Error processing {ticker}: {e}")
        return False, 0, []


def send_repeated_notifications(confirmed_tickers: Dict[str, tuple[float, list[float]]],
                                num_notifications: int, interval_minutes: int, pb_api_key: str):
    """Send N notifications for the confirmed tickers, waiting M minutes between each."""
    print(f"\nStarting notification thread for {len(confirmed_tickers)} tickers...")

    for i in range(num_notifications):
        print(f"\nSending notification {i + 1} of {num_notifications}")

        message = "Volume Confirmation detected (1.5x previous max):\n\n"
        for ticker, (curr_vol, prev_vols) in confirmed_tickers.items():
            message += f"{ticker}:\n"
            message += f"Current Volume: {curr_vol:,.0f}\n"
            message += f"Previous max: {max(prev_vols):,.0f}\n"
            message += f"Ratio: {curr_vol / max(prev_vols):.2f}x\n\n"

        success = send_notification(
            f"Volume Confirmation Alert ({i + 1}/{num_notifications})",
            message.strip(),
            pb_api_key
        )

        if i < num_notifications - 1:  # Don't wait after the last notification
            print(f"\n[Notification Thread] Waiting {interval_minutes} minutes before next notification...")
            time.sleep(interval_minutes * 60)

    print("\n[Notification Thread] Completed notification sequence")


def monitor_tickers(tickers: Set[str], notifications_per_alert: int, interval_minutes: int, pb_api_key: str):
    print("\n=== Starting Monitoring Session ===")
    print(f"Monitoring tickers: {', '.join(sorted(tickers))}")
    print(f"Will send {notifications_per_alert} notifications for each alert")
    print(f"Interval between notifications: {interval_minutes} minutes")

    notified_tickers: Set[str] = set()
    active_notification_threads = []

    while tickers - notified_tickers:
        market_time = get_market_time()

        # Clean up completed notification threads
        active_notification_threads = [t for t in active_notification_threads if t.is_alive()]

        print(f"\n=== Starting new check at {market_time.strftime('%Y-%m-%d %H:%M:%S %Z')} ===")
        print(f"Active notification threads: {len(active_notification_threads)}")

        if not is_market_open(market_time):
            wait_mins = 1
            print(f"\nMarket is closed. Waiting {wait_mins} minute before next check...")
            time.sleep(wait_mins * 60)
            continue

        confirmed_tickers: Dict[str, tuple[float, list[float]]] = {}

        # Check all remaining tickers
        remaining_tickers = tickers - notified_tickers
        print(f"\nChecking {len(remaining_tickers)} remaining tickers...")

        for ticker in remaining_tickers:
            has_conf, curr_vol, prev_vols = check_volume_confirmation(ticker)
            if has_conf:
                confirmed_tickers[ticker] = (curr_vol, prev_vols)

        # If we found any confirmations, start a new notification thread
        if confirmed_tickers:
            print(f"\nFound {len(confirmed_tickers)} new confirmations!")

            # Create and start notification thread
            notification_thread = threading.Thread(
                target=send_repeated_notifications,
                args=(confirmed_tickers.copy(), notifications_per_alert, interval_minutes, pb_api_key)
            )
            notification_thread.start()
            active_notification_threads.append(notification_thread)

            notified_tickers.update(confirmed_tickers.keys())
        else:
            print("\nNo new volume confirmations found in this check")

        # Print status update
        print("\n=== Status Update ===")
        print(f"Time: {get_market_time().strftime('%Y-%m-%d %H:%M:%S %Z')}")
        print(f"Tickers still monitoring: {len(tickers - notified_tickers)}")
        if notified_tickers:
            print(f"Tickers with confirmation: {', '.join(sorted(notified_tickers))}")
        print(f"Active notification threads: {len(active_notification_threads)}")

        # Sleep for a minute before next check
        print("\nWaiting 1 minute before checking again...")
        time.sleep(60)

    # Wait for any remaining notification threads to complete
    for thread in active_notification_threads:
        thread.join()


def main():
    parser = argparse.ArgumentParser(description='Monitor stock volume confirmation')
    parser.add_argument('tickers', nargs='+', help='List of ticker symbols to monitor')
    parser.add_argument('notifications', type=int,
                        help='Number of notifications to send for each volume confirmation')
    parser.add_argument('interval', type=int, help='Minutes between repeat notifications')
    parser.add_argument('--api-key', default='o.wGKIxLjXYGEBNyVEX3WPT8EqTyyJ3vds',
                        help='Pushbullet API key')

    args = parser.parse_args()

    tickers = set(ticker.upper() for ticker in args.tickers)

    print("\n=== Volume Confirmation Monitor ===")
    print(f"Starting monitoring for {len(tickers)} tickers: {', '.join(sorted(tickers))}")
    print(f"Will send {args.notifications} notifications for each volume confirmation")
    print(f"Waiting {args.interval} minutes between repeat notifications")

    monitor_tickers(tickers, args.notifications, args.interval, args.api_key)

    print("\n=== Monitoring Complete ===")
    print("All tickers have been processed")


if __name__ == "__main__":
    main()