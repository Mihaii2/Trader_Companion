from flask import Flask, request, jsonify
import subprocess
import shlex
import sys
import os
import pandas as pd
from datetime import datetime
from typing import List, Optional
from flask_microservice_stocks_filterer.stocks_filtering_application.pipeline_status import PipelineStatus

app = Flask(__name__)


def run_stock_screening(
        price_increase: float,
        ranking_method: Optional[str] = None,
        fetch_data: bool = False,
        top_n: Optional[int] = None,
        obligatory_screens: Optional[List[str]] = None,
        ranking_screens: Optional[List[str]] = None,
        skip_obligatory: bool = False,
        skip_sentiment: bool = False
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
                "message": "Another screening process is currently running",
                "current_pipeline": {
                    "step": current_status.get("current_step"),
                    "started": current_status.get("start_time"),
                    "last_updated": current_status.get("last_updated")
                }
            }

    command = ["python", "stock_screening_pipeline.py", str(price_increase)]

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

    # Start process without waiting for it to complete
    subprocess.Popen(
        command,
        cwd="./stocks_filtering_application",
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

    return {
        "status": "success",
        "message": "Screening process started",
        "command": " ".join(command)
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

    try:
        # Check if file exists
        if not os.path.exists(file_path):
            return jsonify({
                "status": "error",
                "error": f"Ranking file {filename} not found"
            }), 404

        # Get file creation time
        file_creation_timestamp = os.path.getctime(file_path)
        creation_date = datetime.fromtimestamp(file_creation_timestamp).isoformat()

        # Read CSV file
        df = pd.read_csv(file_path)

        # Convert DataFrame to list of dictionaries
        rankings_data = df.fillna('').to_dict('records')

        return jsonify({
            "status": "success",
            "data": rankings_data,
            "created_at": creation_date
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "error": f"Error reading ranking file: {str(e)}"
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
        - end_time: When the pipeline ended (if completed/failed)
        - last_updated: Last time the status was updated
        - errors: List of errors if any occurred during execution
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
        "price_increase": 10.5,
        "ranking_method": "price",
        "fetch_data": true,
        "top_n": 20,
        "obligatory_screens": ["screen1", "screen2"],
        "ranking_screens": ["screen3", "screen4"],
        "skip_obligatory": false,
        "skip_sentiment": false
    }
    """
    data = request.get_json()

    if not data or 'price_increase' not in data:
        return jsonify({
            "status": "error",
            "error": "price_increase is required"
        }), 400

    result = run_stock_screening(
        price_increase=data['price_increase'],
        ranking_method=data.get('ranking_method'),
        fetch_data=data.get('fetch_data', False),
        top_n=data.get('top_n'),
        obligatory_screens=data.get('obligatory_screens'),
        ranking_screens=data.get('ranking_screens'),
        skip_obligatory=data.get('skip_obligatory', False),
        skip_sentiment=data.get('skip_sentiment', False)
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


if __name__ == '__main__':
    app.run(port=5000)