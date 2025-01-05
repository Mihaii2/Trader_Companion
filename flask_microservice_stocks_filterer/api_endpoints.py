import time
from flask import Flask, request, jsonify
import subprocess
import shlex
import sys
import subprocess
import os
import signal
import pandas as pd
import psutil
from datetime import datetime
from typing import List, Optional
from stocks_filtering_application.pipeline_status import PipelineStatus
app = Flask(__name__)

def run_stock_screening(
        min_price_increase: float,
        ranking_method: Optional[str] = None,
        fetch_data: bool = False,
        top_n: Optional[int] = None,
        obligatory_screens: Optional[List[str]] = None,
        ranking_screens: Optional[List[str]] = None,
        skip_obligatory: bool = False,
        skip_sentiment: bool = False,
        sleep_after: bool = False
) -> dict:
    """
    Run the stock screening pipeline with the given parameters asynchronously.
    Checks if another pipeline is already running before starting a new one.
    """
    # Check current pipeline status
    current_status = PipelineStatus.get_status()

    if current_status is not None:
        # Check if there's a pipeline currently running
        if current_status.get("status") == "running":
            return {
                "status": "error",
                "message": "Another screening process is currently running"
            }

    command = ["python", "stock_screening_pipeline.py", str(min_price_increase)]

    if ranking_method:
        command.extend(["--ranking-method", ranking_method])

    if fetch_data:
        command.append("--fetch-data")

    if top_n is not None:
        command.extend(["--top-n", str(top_n)])

    if obligatory_screens:
        command.extend(["--obligatory-screens"] + obligatory_screens)

    if ranking_screens:
        command.extend(["--ranking-screens"] + ranking_screens)

    if skip_obligatory:
        command.append("--skip-obligatory")

    if skip_sentiment:
        command.append("--skip-sentiment")

    if sleep_after:
        command.append("--sleep-after")

    # Save the command in the current folder in a file
    with open("command.txt", "w") as f:
        f.write(" ".join(command))

    proc = subprocess.Popen(
        command,
        cwd="./stocks_filtering_application",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    return {
        "status": "success",
        "message": "Screening process started",
    }

def add_banned_stocks(ticker_duration_pairs: List[tuple]) -> dict:
    """
    Add stocks to the banned list with their respective durations
    """
    # Modified command to use relative path from stocks_filtering_application
    command = ["python", "banned_stocks/add_banned_stocks.py"]
    for ticker, duration in ticker_duration_pairs:
        command.extend([ticker, str(duration)])

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            check=True,
            cwd="./stocks_filtering_application"  # Set working directory
        )
        return {
            "status": "success",
            "output": result.stdout,
            "command": " ".join(command)
        }
    except subprocess.CalledProcessError as e:
        return {
            "status": "error",
            "error": e.stderr,
            "command": " ".join(command)
        }

@app.route('/rankings/<filename>', methods=['GET'])
def get_rankings(filename):
    """
    Get the contents of a ranking file

    Args:
        filename (str): Name of the ranking file (without .csv extension)

    Returns:
        JSON object containing the CSV data, creation date, and status or error message
    """
    # Ensure the filename ends with .csv
    if not filename.endswith('.csv'):
        filename = f"{filename}.csv"

    file_path = os.path.join('./stocks_filtering_application', filename)
    stock_data_path = os.path.join('./stocks_filtering_application', 'stock_api_data',
                                   'nasdaq_stocks_1_year_price_data.csv')

    try:
        # Check if ranking file exists
        if not os.path.exists(file_path):
            return jsonify({
                "status": "error",
                "message": f"Ranking file {filename} not found"
            }), 404

        # Check if stock data file exists
        if not os.path.exists(stock_data_path):
            return jsonify({
                "status": "error",
                "message": "Stock price data file not found. Run the Pipeline with Fetching enabled first."
            }), 404

        # Get modification times for both files
        price_data_timestamp = os.path.getmtime(stock_data_path)
        rankings_timestamp = os.path.getmtime(file_path)

        price_data_date = datetime.fromtimestamp(price_data_timestamp).isoformat()
        rankings_date = datetime.fromtimestamp(rankings_timestamp).isoformat()

        # Read CSV file
        df = pd.read_csv(file_path)

        # Convert DataFrame to list of dictionaries
        rankings_data = df.fillna('').to_dict('records')

        return jsonify({
            "status": "success",
            "message": rankings_data,
            "stock_data_created_at": price_data_date,
            "rankings_created_at": rankings_date
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error reading files: {str(e)}"
        }), 500

@app.route('/pipeline/status', methods=['GET'])
def get_pipeline_status():
    """
    Get the current pipeline status

    Returns:
        JSON object containing:
        - current_step: Current step being executed
        - steps_completed: List of completed steps
        - current_batch: Current batch number (if fetching data)
        - total_batches: Total number of batches (if fetching data)
        - status: Overall status (running/completed/failed)
        - start_time: When the pipeline started
        - last_updated: Last time the status was updated
        - process_pid: PID of the running process
    """
    status = PipelineStatus.get_status()

    if status is None:
        return jsonify({
            "status": "error",
            "error": "No pipeline status found"
        }), 404

    return jsonify(status)

@app.route('/run_screening', methods=['POST'])
def screen_stocks():
    """
    API endpoint for stock screening. Checks if another pipeline is already running
    before starting a new one.

    Example POST body:
    {
        "min_price_increase": 10.5,
        "ranking_method": "price",
        "fetch_data": true,
        "top_n": 20,
        "obligatory_screens": ["screen1", "screen2"],
        "ranking_screens": ["screen3", "screen4"],
        "skip_obligatory": false,
        "skip_sentiment": false,
        "sleep_after": false
    }
    """
    data = request.get_json()

    print(data)

    if not data or 'min_price_increase' not in data:
        return jsonify({
            "status": "error",
            "message": "min_price_increase is required"
        }), 400

    result = run_stock_screening(
        min_price_increase=data['min_price_increase'],
        ranking_method=data.get('ranking_method'),
        fetch_data=data.get('fetch_data', False),
        top_n=data.get('top_n'),
        obligatory_screens=data.get('obligatory_screens'),
        ranking_screens=data.get('ranking_screens'),
        skip_obligatory=data.get('skip_obligatory', False),
        skip_sentiment=data.get('skip_sentiment', False),
        sleep_after=data.get('sleep_after', False)
    )

    # If there's an error due to running pipeline, return 409 Conflict
    if result["status"] == "error" and "Another screening process is currently running" in result["message"]:
        return jsonify(result), 409

    return jsonify(result)


@app.route('/ban', methods=['POST'])
def ban_stocks():
    """
    API endpoint for banning stocks

    Example POST body:
    {
        "stocks": [
            {"ticker": "AAPL", "duration": 3},
            {"ticker": "MSFT", "duration": 1}
        ]
    }
    """
    data = request.get_json()

    if not data or 'stocks' not in data:
        return jsonify({
            "status": "error",
            "error": "stocks list is required"
        }), 400

    try:
        ticker_duration_pairs = [
            (stock['ticker'], stock['duration'])
            for stock in data['stocks']
        ]
    except (KeyError, TypeError):
        return jsonify({
            "status": "error",
            "error": "Invalid stock format. Each stock must have 'ticker' and 'duration'"
        }), 400

    result = add_banned_stocks(ticker_duration_pairs)
    return jsonify(result)


@app.route('/pipeline/stop', methods=['POST'])
def stop_pipeline():
    """
    Stop the currently running pipeline process.
    Returns success even if no process is running.
    """
    status = PipelineStatus.get_status()

    if status is None:
        return jsonify({
            "status": "success",
            "message": "No pipeline status found"
        })

    pid = status.get("process_pid")

    try:
        if pid is not None:
            # Try to terminate the process gracefully first
            try:
                # SIGTERM is more portable than SIGKILL
                # Ensure the PID is not of the current process
                if pid != os.getpid():
                    os.kill(pid, signal.SIGTERM)
                # Give it a moment to terminate gracefully
                time.sleep(1)
            except ProcessLookupError:
                pass  # Process not found or already terminated

            # If process still exists, force kill it
            try:
                # On Windows, this will call TerminateProcess
                # On Unix, this will send SIGKILL
                # Ensure the PID is not of the current process
                if psutil.pid_exists(pid) and pid != os.getpid():
                    process = psutil.Process(pid)
                    process.kill()
            except (ProcessLookupError, psutil.NoSuchProcess, psutil.AccessDenied):
                pass  # Process already terminated or can't access

    except Exception as e:
        # Log other errors but continue to mark pipeline as completed
        print(f"Error stopping process: {str(e)}")

    # Update status to completed regardless of whether a process was running
    PipelineStatus.complete_pipeline()

    return jsonify({
        "status": "success",
        "message": "Pipeline stopped successfully"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)