import os
import subprocess
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import sys
import ctypes
import threading
import argparse
import uuid
from pipeline_status import PipelineStatus

# Get the current script's directory
script_dir = os.path.dirname(os.path.abspath(__file__))

# Define file paths
price_fundamental_script = os.path.join(script_dir, "price_1y_fundamental_2y.py")
obligatory_passed_stocks = os.path.join(script_dir, "obligatory_screens", "obligatory_screen_passer.py")
obligatory_data_filter = os.path.join(script_dir, "ranking_screens", "passed_stocks_input_data",
                                      "obligatory_screen_data_filter.py")
banned_filter = os.path.join(script_dir, "banned_Stocks", "banned_filter.py")
top_n_stocks_price_increase = os.path.join(script_dir, "top_n_stocks_by_price_increase.py")
top_n_stocks_nr_screeners = os.path.join(script_dir, "top_n_stocks_by_nr_screeners.py")
history_handler = os.path.join(script_dir, "market_sentiment_screens", "history_handler.py")

# Default screens if none provided
DEFAULT_OBLIGATORY_SCREENS = [
    "above_52week_low",
    "trending_up",
    "close_to_52week_high",
    "minimum_volume_100k",
    "minimum_price_increase"
]

DEFAULT_RANKING_SCREENS = [
    "annual_EPS_acceleration",
    "annual_margin_acceleration",
    "annual_sales_acceleration",
    "quarterly_EPS_acceleration",
    "quarterly_eps_breakout",
    "quarterly_margin_acceleration",
    "quarterly_sales_acceleration",
    "rs_over_70",
    "rsi_trending_up",
    "volume_acceleration",
    "price_spikes",
    "top_price_increases_1y"
]

# Market sentiment screens (always run all of these)
MARKET_SENTIMENT_SCREENS = [
    "52week_high_2w",
    "52week_low_2w",
    "rs_over_70",
    "rsi_under_30",
    "rsi_trending_up",
    "rsi_trending_down",
    "52week_high_1d",
    "52week_low_1d"
]

# Directories to scan for CSV cleanup
dirs_to_cleanup = [
    os.path.join(script_dir, "obligatory_screens", "results"),
    os.path.join(script_dir, "ranking_screens", "results"),
    os.path.join(script_dir, "market_sentiment_screens", "results")
]


def find_csv_files():
    """Find all CSV files in the specified directories."""
    csv_files = []
    for directory in dirs_to_cleanup:
        if os.path.exists(directory):
            for root, _, files in os.walk(directory):
                for file in files:
                    if file.lower().endswith('.csv'):
                        csv_files.append(os.path.join(root, file))
    return csv_files


def parse_args():
    parser = argparse.ArgumentParser(description='Stock screening pipeline')
    parser.add_argument('price_increase', type=float,
                        help='Minimum price increase percentage')
    parser.add_argument('--ranking-method', type=str,
                        choices=['price', 'screeners'],
                        default='price',
                        help='Ranking method: price (by price increase) or screeners (by number of screeners)')
    parser.add_argument('--fetch-data', action='store_true',
                        help='Run price fundamental script to fetch new data')
    parser.add_argument('--top-n', type=int, default=100,
                        help='Number of top stocks to select in the ranking')

    # Add arguments for screens
    parser.add_argument('--obligatory-screens', nargs='+',
                        default=DEFAULT_OBLIGATORY_SCREENS,
                        help='List of obligatory screens to run (without .py extension)')
    parser.add_argument('--ranking-screens', nargs='+',
                        default=DEFAULT_RANKING_SCREENS,
                        help='List of ranking screens to run (without .py extension)')

    return parser.parse_args()


def get_full_paths(screen_names, screen_type):
    """Convert screen names to full paths based on screen type."""
    base_path = {
        'obligatory': 'obligatory_screens',
        'ranking': 'ranking_screens',
        'sentiment': 'market_sentiment_screens'
    }[screen_type]

    return [os.path.join(script_dir, base_path, f"{name}.py") for name in screen_names]


def delete_file(file_path):
    """Delete a file if it exists."""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        print(f"Error deleting {file_path}: {e}")


def print_output(pipe, prefix):
    """Print output from a pipe with a prefix."""
    try:
        while True:
            line = pipe.readline()
            if not line:
                break
            print(f"{prefix}: {line.decode().strip()}", flush=True)
    except Exception as e:
        print(f"Error reading output: {e}")


def run_script(script_path, args=None, status_tracker=None):
    """Run a Python script with optional arguments and capture its output in real-time."""
    script_name = os.path.basename(script_path)

    # Build command with optional arguments
    command = [sys.executable, '-u', script_path]
    if args:
        command.extend(args)

    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        bufsize=0,
        universal_newlines=True  # Changed to True for string output
    )

    def handle_output(pipe, prefix, is_error=False):
        """Handle output from a pipe with a prefix."""
        try:
            for line in pipe:
                print(f"{prefix}: {line.strip()}", flush=True)
                if status_tracker:
                    status_tracker.handle_script_output(line, script_name)
        except Exception as e:
            print(f"Error reading output: {e}")

    stdout_thread = threading.Thread(
        target=handle_output,
        args=(process.stdout, f"[{script_name}]"),
        daemon=True
    )
    stderr_thread = threading.Thread(
        target=handle_output,
        args=(process.stderr, f"[{script_name} ERROR]", True),
        daemon=True
    )

    stdout_thread.start()
    stderr_thread.start()

    process.wait()

    process.stdout.close()
    process.stderr.close()

    stdout_thread.join(timeout=1)
    stderr_thread.join(timeout=1)

    return process.returncode


def run_scripts_in_parallel(scripts, description, price_increase=None):
    """Run multiple scripts in parallel and show their output."""
    print(f"\nRunning {description}...")
    with ThreadPoolExecutor() as executor:
        futures = []
        for script in scripts:
            # Check if this is the minimum_price_increase script and we have a price_increase value
            if os.path.basename(script) == "minimum_price_increase.py" and price_increase is not None:
                args = [str(price_increase)]
                futures.append(executor.submit(run_script, script, args))
            else:
                futures.append(executor.submit(run_script, script))

        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                print(f"Error running script: {e}")


def main():
    try:
        args = parse_args()

        # Create a unique ID for this pipeline run
        status_tracker = PipelineStatus()

        # Convert screen names to full paths
        obligatory_screens = get_full_paths(args.obligatory_screens, 'obligatory')
        ranking_screens = get_full_paths(args.ranking_screens, 'ranking')
        market_sentiment_screens = get_full_paths(MARKET_SENTIMENT_SCREENS, 'sentiment')

        # Clean up old CSV files
        status_tracker.update_step("cleaning_old_files")
        print("Finding and deleting old CSV files...")
        csv_files = find_csv_files()
        print(f"Found {len(csv_files)} CSV files to delete")
        for file_path in csv_files:
            print(f"Deleting: {os.path.basename(file_path)}")
            delete_file(file_path)

        # Fetch stock data if requested
        if args.fetch_data:
            status_tracker.update_step("fetching_stock_data")
            print("\nFetching stock data from the API...")
            run_script(price_fundamental_script, status_tracker=status_tracker)
        else:
            print("\nSkipping data fetch, using existing data...")

        # Run obligatory screens
        status_tracker.update_step("running_obligatory_screens")
        print("\nRunning obligatory screen scripts...")
        run_scripts_in_parallel(obligatory_screens, "obligatory screens", args.price_increase)

        status_tracker.update_step("checking_obligatory_screens")
        print("\nChecking which stocks passed the obligatory screens...")
        run_script(obligatory_passed_stocks)

        status_tracker.update_step("checking_banned_stocks")
        print("\nChecking which files are banned, creating unbanned stocks list...")
        run_script(banned_filter)

        status_tracker.update_step("filtering_passed_stocks")
        print("\nRunning the filter for passed and unbanned stocks...")
        run_script(obligatory_data_filter)

        status_tracker.update_step("running_ranking_screens")
        run_scripts_in_parallel(ranking_screens, "ranking screen scripts")

        status_tracker.update_step("finding_top_stocks")
        print(f"\nSearching for the top {args.top_n} stocks...")
        if args.ranking_method == 'price':
            run_script(top_n_stocks_price_increase, [str(args.top_n)])
        else:  # ranking_method == 'screeners'
            run_script(top_n_stocks_nr_screeners, [str(args.top_n)])

        status_tracker.update_step("running_sentiment_screens")
        run_scripts_in_parallel(market_sentiment_screens, "market sentiment screen scripts")

        status_tracker.update_step("running_history_handler")
        print("\nRunning history handler script...")
        run_script(history_handler)

        print("\nAll scripts completed.")
        status_tracker.complete_pipeline()

    except Exception as e:
        status_tracker.fail_pipeline(str(e))
        raise e


if __name__ == "__main__":
    main()