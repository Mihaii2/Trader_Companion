from flask import Flask, request, jsonify
import subprocess
import shlex
import sys
from typing import List, Optional

app = Flask(__name__)


def run_stock_screening(
        price_increase: float,
        ranking_method: Optional[str] = None,
        fetch_data: bool = False,
        top_n: Optional[int] = None,
        obligatory_screens: Optional[List[str]] = None,
        ranking_screens: Optional[List[str]] = None
) -> dict:
    """
    Run the stock screening pipeline with the given parameters
    """
    # Modified command to use relative path from stocks_filtering_application
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


@app.route('/stock_filtering_app/run_screening', methods=['POST'])
def screen_stocks():
    """
    API endpoint for stock screening

    Example POST body:
    {
        "price_increase": 10.5,
        "ranking_method": "price",
        "fetch_data": true,
        "top_n": 20,
        "obligatory_screens": ["screen1", "screen2"],
        "ranking_screens": ["screen3", "screen4"]
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
        ranking_screens=data.get('ranking_screens')
    )

    return jsonify(result)


@app.route('/stock_filtering_app/ban', methods=['POST'])
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