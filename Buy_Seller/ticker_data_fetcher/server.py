import yfinance as yf
import time
import threading
from collections import deque
from datetime import datetime, timezone, date, timedelta, time as dt_time
from flask import Flask, jsonify, request
import json
import logging
import flask_cors
import pytz
import requests  # For calling the stock buyer server

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class StockDataServer:
    def __init__(self):
        self.tickers = []
        self.ticker_data = {}  # {ticker: deque of records}
        self.ticker_initial_prices = {}  # Store initial prices for each ticker
        self.current_ticker_index = 0
        self.max_records = 10000
        self.max_requests_per_minute = 120
        self.request_interval = 60 / self.max_requests_per_minute  # 0.5 seconds between requests
        self.running = False
        self.data_thread = None
        self.market_check_interval = 30  # Check market status every 30 seconds when closed
        self.last_cleanup_date = None
        self.last_market_status = None
        
        # ---- Trade activity integration (for pruning inactive tickers) ----
        # Base URL of the stock buyer server status endpoint
        self.trade_server_status_url = "http://localhost:5002/status"
        # How often (seconds) to poll the trade server for active trades
        self.trade_activity_check_interval = 300  # 5 minutes
        # Consider a ticker inactive if no active trade for this many hours
        self.inactive_ticker_hours = 8
        # Timestamp of last poll
        self.last_trade_activity_check = 0.0
        # Map: ticker -> last timestamp (epoch seconds) it was seen in an active trade
        self.ticker_last_trade_seen = {}
        # Cache of last successful active trade tickers (for logging diffs)
        self.last_active_trade_tickers = set()
        
        # Use Eastern Time for market hours (9:30 AM - 4:00 PM ET)
        self.market_open_hour = 9
        self.market_open_minute = 30
        self.market_close_hour = 16
        self.market_close_minute = 0
        
    def get_current_time(self):
        """Get current Eastern Time"""
        et = pytz.timezone('US/Eastern')
        return datetime.now(et)
        
    def is_market_open(self):
        """Check if the market is currently open (9:30 AM - 4:00 PM ET, Monday-Friday)"""
        try:
            et = pytz.timezone('US/Eastern')
            now = datetime.now(et)
            
            # Market is closed on weekends (Saturday = 5, Sunday = 6)
            if now.weekday() >= 5:
                return False, self.get_time_until_next_open(now)
            
            # Market hours: 9:30 AM - 4:00 PM ET
            market_open_time = dt_time(self.market_open_hour, self.market_open_minute)
            market_close_time = dt_time(self.market_close_hour, self.market_close_minute)
            current_time = now.time()
            
            is_open = market_open_time <= current_time <= market_close_time
            
            if is_open:
                return True, None
            else:
                return False, self.get_time_until_next_open(now)
                
        except Exception as e:
            logger.error(f"Error checking market status: {str(e)}")
            # Default to checking if it's a weekday and reasonable hours
            et = pytz.timezone('US/Eastern')
            now = datetime.now(et)
            if now.weekday() < 5 and self.market_open_hour <= now.hour < self.market_close_hour:
                return True, None
            return False, timedelta(hours=1)  # Default wait time
    
    def get_time_until_next_open(self, current_time):
        """Calculate time until next market open (Eastern Time)"""
        try:
            # Start with today's market open time
            next_open = current_time.replace(hour=self.market_open_hour, minute=self.market_open_minute, second=0, microsecond=0)
            
            # If it's already past today's market open time, move to next day
            if current_time >= next_open:
                next_open += timedelta(days=1)
            
            # Skip weekends - if next open falls on Saturday or Sunday, move to Monday
            while next_open.weekday() >= 5:  # 5 = Saturday, 6 = Sunday
                next_open += timedelta(days=1)
            
            time_diff = next_open - current_time
            return time_diff
            
        except Exception as e:
            logger.error(f"Error calculating time until market open: {str(e)}")
            return timedelta(hours=1)  # Default fallback
    
    def format_time_until_open(self, time_diff):
        """Format time difference into readable string"""
        if time_diff is None:
            return "Market is open"
        
        total_seconds = int(time_diff.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        
        # Calculate when market opens in Eastern Time
        now = self.get_current_time()
        next_open = now + time_diff
        
        et_time_str = next_open.strftime('%H:%M ET')
        date_str = next_open.strftime('%A, %B %d')
        
        if hours > 24:
            days = hours // 24
            remaining_hours = hours % 24
            return f"Market opens in {days} days, {remaining_hours} hours ({et_time_str} on {date_str})"
        elif hours > 0:
            return f"Market opens in {hours}h {minutes}m ({et_time_str} on {date_str})"
        else:
            return f"Market opens in {minutes} minutes ({et_time_str})"
    
    def cleanup_old_records(self):
        """Remove all records that are not from today"""
        today = self.get_current_time().date()
        
        # Only run cleanup once per day
        if self.last_cleanup_date == today:
            return
        
        logger.info("Performing daily cleanup of old records...")
        
        cleaned_tickers = 0
        total_removed = 0
        
        for symbol in self.tickers:
            if symbol in self.ticker_data:
                original_count = len(self.ticker_data[symbol])
                
                # Filter to keep only today's records
                today_records = deque(maxlen=self.max_records)
                for record in self.ticker_data[symbol]:
                    try:
                        # Parse timestamp
                        record_dt = datetime.fromisoformat(record['timestamp'].replace('Z', '+00:00'))
                        if record_dt.tzinfo is not None:
                            # Convert to naive datetime (local time)
                            record_dt = record_dt.replace(tzinfo=None)
                        record_date = record_dt.date()
                        
                        if record_date == today:
                            today_records.append(record)
                    except (ValueError, KeyError, AttributeError) as e:
                        logger.warning(f"Skipping malformed record: {e}")
                        continue
                
                self.ticker_data[symbol] = today_records
                removed_count = original_count - len(today_records)
                
                if removed_count > 0:
                    total_removed += removed_count
                    cleaned_tickers += 1
        
        if cleaned_tickers > 0:
            logger.info(f"Cleaned up {total_removed} old records from {cleaned_tickers} tickers")
        
        self.last_cleanup_date = today
    
    def add_initial_market_open_record(self, symbol, current_price):
        """Add an initial record with volume 0 when market opens"""
        try:
            # Create initial record with volume 0
            initial_record = {
                'symbol': symbol,
                'timestamp': datetime.now().isoformat(),
                'currentPrice': current_price,
                'dayHigh': current_price,
                'dayLow': current_price,
                'volume': 0  # Set volume to 0 for market open record
            }
            
            # Clear existing data and add the initial record
            self.ticker_data[symbol].clear()
            self.ticker_data[symbol].append(initial_record)
            self.ticker_initial_prices[symbol] = current_price

            logger.info(f"Added market open record for {symbol}: ${current_price} with volume 0")
            
        except Exception as e:
            logger.error(f"Error adding initial market open record for {symbol}: {str(e)}")
    
    def add_ticker(self, symbol):
        """Add a ticker to the monitoring list"""
        symbol = symbol.upper().strip()
        if symbol and symbol not in self.tickers:
            self.tickers.append(symbol)
            self.ticker_data[symbol] = deque(maxlen=self.max_records)
            self.ticker_initial_prices[symbol] = None
            # Mark as recently "seen" so it gets a full inactivity window grace period
            # even if no trade exists yet. This prevents immediate pruning on next check.
            self.ticker_last_trade_seen[symbol] = time.time()
            # Remove any previous absence marker if present (re-adding scenario)
            absence_key = f"__absence_start__:{symbol}"
            if absence_key in self.ticker_last_trade_seen:
                del self.ticker_last_trade_seen[absence_key]
            logger.info(f"Added ticker: {symbol}")
            return True
        return False
    
    def remove_ticker(self, symbol):
        """Remove a ticker from the monitoring list"""
        symbol = symbol.upper().strip()
        if symbol in self.tickers:
            self.tickers.remove(symbol)
            del self.ticker_data[symbol]
            if symbol in self.ticker_initial_prices:
                del self.ticker_initial_prices[symbol]
            logger.info(f"Removed ticker: {symbol}")
            return True
        return False
    
    def fetch_ticker_data(self, symbol):
        """Fetch data for a single ticker"""
        try:
            ticker = yf.Ticker(symbol)
            
            # Use multiple methods to get current price
            current_price = None
            volume = None
            day_high = None
            day_low = None
            
            # Try getting from info first
            try:
                info = ticker.info
                current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                volume = info.get('volume') or info.get('regularMarketVolume')
                day_high = info.get('dayHigh') or info.get('regularMarketDayHigh')
                day_low = info.get('dayLow') or info.get('regularMarketDayLow')
            except Exception as e:
                logger.warning(f"Could not get info for {symbol}: {e}")
            
            # If info didn't work, try history
            if current_price is None:
                try:
                    hist = ticker.history(period="1d", interval="1m")
                    if not hist.empty:
                        latest = hist.iloc[-1]
                        current_price = latest['Close']
                        volume = latest['Volume']
                        day_high = hist['High'].max()
                        day_low = hist['Low'].min()
                except Exception as e:
                    logger.warning(f"Could not get history for {symbol}: {e}")
            
            if current_price is None:
                logger.warning(f"No price data available for {symbol}")
                return
            
            record = {
                'symbol': symbol,
                'timestamp': datetime.now().isoformat(),
                'currentPrice': float(current_price),
                'dayHigh': float(day_high) if day_high is not None else float(current_price),
                'dayLow': float(day_low) if day_low is not None else float(current_price),
                'volume': int(volume) if volume is not None else 0
            }
            
            # Check for duplicates before adding (skip if same price and volume)
            if not self.ticker_data[symbol] or (
                abs(self.ticker_data[symbol][-1]['currentPrice'] - record['currentPrice']) > 0.001 or 
                self.ticker_data[symbol][-1]['volume'] != record['volume']
            ):
                self.ticker_data[symbol].append(record)
                logger.info(f"Fetched data for {symbol}: ${record['currentPrice']:.4f} | volume {record['volume']} | time {record['timestamp'][:19]}")
            else:
                logger.debug(f"Skipped duplicate data for {symbol}")
                
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {str(e)}")
    
    def data_collection_loop(self):
        """Main loop for collecting data in round-robin fashion"""
        consecutive_errors = 0
        max_consecutive_errors = 5
        
        while self.running:
            try:
                # Perform daily cleanup
                self.cleanup_old_records()
                
                # Check if market is open
                market_open, time_until_open = self.is_market_open()
                
                # Log market status changes
                if self.last_market_status != market_open:
                    if market_open:
                        logger.info("Market status: OPEN - Starting data collection")
                    else:
                        status_msg = self.format_time_until_open(time_until_open)
                        logger.info(f"Market status: CLOSED - {status_msg}")
                
                # Check if market just opened
                if market_open and self.last_market_status is False:
                    logger.info("Market just opened! Waiting 15 seconds before starting data collection...")
                    time.sleep(15)
                    logger.info("15-second delay complete. Adding initial records with volume 0 for all tickers.")
                    
                    # Add initial records for ALL tickers at once
                    for symbol in self.tickers:
                        try:
                            ticker = yf.Ticker(symbol)
                            info = ticker.info
                            current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                            if current_price:
                                self.add_initial_market_open_record(symbol, current_price)
                        except Exception as e:
                            logger.error(f"Error adding initial record for {symbol}: {e}")
                
                self.last_market_status = market_open
                
                # If market is closed, wait and continue
                if not market_open:
                    time.sleep(self.market_check_interval)
                    continue
                
                # If no tickers, wait briefly
                if not self.tickers:
                    time.sleep(5)
                    continue

                # Periodically poll trade server for active trades & prune inactive tickers
                now_epoch = time.time()
                if now_epoch - self.last_trade_activity_check >= self.trade_activity_check_interval:
                    self.last_trade_activity_check = now_epoch
                    try:
                        self.update_active_trades()
                        self.cleanup_inactive_tickers()
                    except Exception as e:
                        logger.error(f"Trade activity update/cleanup failed: {e}")
                
                # Get next ticker in round-robin fashion
                if self.current_ticker_index >= len(self.tickers):
                    self.current_ticker_index = 0
                
                current_ticker = self.tickers[self.current_ticker_index]
                self.fetch_ticker_data(current_ticker)
                
                # Move to next ticker
                self.current_ticker_index += 1
                
                # Reset error counter on success
                consecutive_errors = 0
                
                # Wait for the interval
                time.sleep(self.request_interval)
                
            except Exception as e:
                consecutive_errors += 1
                logger.error(f"Error in data collection loop (#{consecutive_errors}): {str(e)}")
                
                if consecutive_errors >= max_consecutive_errors:
                    logger.error(f"Too many consecutive errors ({consecutive_errors}). Waiting 60 seconds...")
                    time.sleep(60)
                    consecutive_errors = 0
                else:
                    time.sleep(5)  # Brief wait before retrying
    
    def start(self):
        """Start the data collection"""
        if not self.running:
            self.running = True
            self.data_thread = threading.Thread(target=self.data_collection_loop)
            self.data_thread.daemon = True
            self.data_thread.start()
            logger.info("Data collection thread started")
    
    def stop(self):
        """Stop the data collection"""
        if self.running:
            self.running = False
            if self.data_thread and self.data_thread.is_alive():
                self.data_thread.join(timeout=5)
            logger.info("Data collection stopped")
    
    def get_ticker_data(self, symbol):
        """Get all data for a ticker"""
        symbol = symbol.upper().strip()
        if symbol in self.ticker_data:
            return list(self.ticker_data[symbol])
        return None
    
    def get_latest_data(self, symbol):
        """Get the latest data point for a ticker"""
        symbol = symbol.upper().strip()
        if symbol in self.ticker_data and self.ticker_data[symbol]:
            return self.ticker_data[symbol][-1]
        return None
    
    def get_market_status(self):
        """Get current market status"""
        market_open, time_until_open = self.is_market_open()
        
        # Add current time information in ET
        current_time = self.get_current_time()
        
        return {
            'is_open': market_open,
            'message': "Market is open" if market_open else self.format_time_until_open(time_until_open),
            'current_time': current_time.strftime('%Y-%m-%d %H:%M:%S ET'),
            'market_hours': f"{self.market_open_hour:02d}:{self.market_open_minute:02d} - {self.market_close_hour:02d}:{self.market_close_minute:02d} ET",
            'next_open': None if market_open else (current_time + time_until_open).strftime('%Y-%m-%d %H:%M:%S ET')
        }

    # ------------------------------------------------------------------
    # Active trade integration methods
    # ------------------------------------------------------------------
    def update_active_trades(self):
        """Poll the stock buyer server to record tickers that have active trades.

        Expected /status response (assumptions due to partial code):
        {
            "success": true,
            "trades": [ { "ticker": "AAPL", ... }, ... ]
        }
        Any trade present is considered an "active trade". We record timestamp of observation.
        """
        try:
            resp = requests.get(self.trade_server_status_url, timeout=5)
            if resp.status_code != 200:
                logger.warning(f"Active trade poll failed HTTP {resp.status_code}: {resp.text[:120]}")
                return
            data = resp.json()
            trades = data.get('trades', []) if isinstance(data, dict) else []
            active_tickers = { (t.get('ticker') or '').upper().strip() for t in trades if t.get('ticker') }
            active_tickers.discard('')
            now = time.time()
            for tkr in active_tickers:
                self.ticker_last_trade_seen[tkr] = now

            # Log changes in active set (additions/removals)
            added = active_tickers - self.last_active_trade_tickers
            removed = self.last_active_trade_tickers - active_tickers
            if added or removed:
                if added:
                    logger.info(f"Active trades added: {', '.join(sorted(added))}")
                if removed:
                    logger.info(f"Active trades no longer present: {', '.join(sorted(removed))}")
            self.last_active_trade_tickers = active_tickers
        except Exception as e:
            logger.error(f"Error updating active trades: {e}")

    def cleanup_inactive_tickers(self):
        """Remove tickers that have not appeared in an active trade for the inactivity window.

        A ticker is removed if:
          - It exists in self.tickers AND
          - Not observed in any active trade for > inactive_ticker_hours
        """
        if not self.tickers:
            return
        cutoff_seconds = self.inactive_ticker_hours * 3600
        now = time.time()
        removed = []
        # Iterate over a copy so we can modify original list
        for symbol in list(self.tickers):
            last_seen = self.ticker_last_trade_seen.get(symbol)
            if last_seen is None:
                # Never seen in any trade; check if older than window since server start
                # Use start time approximation by absence (treat as 0 age until window passes)
                # We'll store first absence timestamp lazily to allow initial grace period.
                # Initialize an absence marker if not set.
                absence_key = f"__absence_start__:{symbol}"
                if absence_key not in self.ticker_last_trade_seen:
                    self.ticker_last_trade_seen[absence_key] = now
                else:
                    if now - self.ticker_last_trade_seen[absence_key] > cutoff_seconds:
                        if symbol in self.tickers:
                            self.tickers.remove(symbol)
                            self.ticker_data.pop(symbol, None)
                            self.ticker_initial_prices.pop(symbol, None)
                            removed.append(symbol)
                continue
            # If seen before but stale
            if now - last_seen > cutoff_seconds:
                if symbol in self.tickers:
                    self.tickers.remove(symbol)
                    self.ticker_data.pop(symbol, None)
                    self.ticker_initial_prices.pop(symbol, None)
                    removed.append(symbol)

        if removed:
            # Reset current_ticker_index if it surpasses length after removals
            if self.current_ticker_index >= len(self.tickers):
                self.current_ticker_index = 0
            logger.info(f"Removed inactive tickers (no active trade in > {self.inactive_ticker_hours}h): {', '.join(sorted(removed))}")

# Initialize the server
stock_server = StockDataServer()

# Flask app for HTTP API
app = Flask(__name__)
flask_cors.CORS(app)  # Enable CORS for all routes

@app.route('/tickers', methods=['GET'])
def get_tickers():
    """Get list of all monitored tickers"""
    return jsonify({
        'tickers': stock_server.tickers,
        'total_count': len(stock_server.tickers)
    })

@app.route('/tickers', methods=['POST'])
def add_ticker():
    """Add a new ticker to monitor"""
    try:
        data = request.get_json()
        if not data or 'symbol' not in data:
            return jsonify({'error': 'Symbol is required'}), 400
        
        symbol = data['symbol']
        if stock_server.add_ticker(symbol):
            return jsonify({'message': f'Ticker {symbol.upper()} added successfully'})
        else:
            return jsonify({'message': f'Ticker {symbol.upper()} already exists'})
    except Exception as e:
        logger.error(f"Error adding ticker: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/tickers/<symbol>', methods=['DELETE'])
def remove_ticker(symbol):
    """Remove a ticker from monitoring"""
    try:
        if stock_server.remove_ticker(symbol):
            return jsonify({'message': f'Ticker {symbol.upper()} removed successfully'})
        else:
            return jsonify({'error': f'Ticker {symbol.upper()} not found'}), 404
    except Exception as e:
        logger.error(f"Error removing ticker: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/data/<symbol>', methods=['GET'])
def get_ticker_data(symbol):
    """Get all historical data for a ticker"""
    try:
        data = stock_server.get_ticker_data(symbol)
        if data is not None:
            return jsonify({
                'symbol': symbol.upper(),
                'record_count': len(data),
                'data': data
            })
        else:
            return jsonify({'error': f'Ticker {symbol.upper()} not found'}), 404
    except Exception as e:
        logger.error(f"Error getting ticker data: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/data/<symbol>/latest', methods=['GET'])
def get_latest_data(symbol):
    """Get the latest data point for a ticker"""
    try:
        data = stock_server.get_latest_data(symbol)
        if data is not None:
            return jsonify(data)
        else:
            return jsonify({'error': f'No data available for ticker {symbol.upper()}'}), 404
    except Exception as e:
        logger.error(f"Error getting latest data: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/market-status', methods=['GET'])
def get_market_status():
    """Get current market status"""
    try:
        return jsonify(stock_server.get_market_status())
    except Exception as e:
        logger.error(f"Error getting market status: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/status', methods=['GET'])
def get_status():
    """Get server status"""
    try:
        market_status = stock_server.get_market_status()
        return jsonify({
            'running': stock_server.running,
            'market_open': market_status['is_open'],
            'market_message': market_status['message'],
            'current_time': market_status['current_time'],
            'market_hours': market_status['market_hours'],
            'tickers_count': len(stock_server.tickers),
            'current_ticker_index': stock_server.current_ticker_index,
            'max_records_per_ticker': stock_server.max_records,
            'request_interval_seconds': stock_server.request_interval,
            'last_cleanup_date': str(stock_server.last_cleanup_date) if stock_server.last_cleanup_date else None
        })
    except Exception as e:
        logger.error(f"Error getting status: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/start', methods=['POST'])
def start_collection():
    """Start data collection"""
    try:
        stock_server.start()
        return jsonify({'message': 'Data collection started'})
    except Exception as e:
        logger.error(f"Error starting collection: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/stop', methods=['POST'])
def stop_collection():
    """Stop data collection"""
    try:
        stock_server.stop()
        return jsonify({'message': 'Data collection stopped'})
    except Exception as e:
        logger.error(f"Error stopping collection: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/cleanup', methods=['POST'])
def manual_cleanup():
    """Manually trigger cleanup of old records"""
    try:
        stock_server.last_cleanup_date = None  # Force cleanup
        stock_server.cleanup_old_records()
        return jsonify({'message': 'Manual cleanup completed'})
    except Exception as e:
        logger.error(f"Error during cleanup: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/inactive-cleanup', methods=['POST'])
def manual_inactive_cleanup():
    """Force poll of trade activity and prune inactive tickers immediately."""
    try:
        stock_server.update_active_trades()
        before = len(stock_server.tickers)
        stock_server.cleanup_inactive_tickers()
        after = len(stock_server.tickers)
        return jsonify({
            'message': 'Inactive ticker cleanup completed',
            'tickers_before': before,
            'tickers_after': after,
            'removed_count': before - after
        })
    except Exception as e:
        logger.error(f"Error during inactive cleanup: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Start data collection
    stock_server.start()
    
    try:
        # Start Flask server
        app.run(host='0.0.0.0', port=5001, debug=False)
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        stock_server.stop()