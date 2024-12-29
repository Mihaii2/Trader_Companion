import os
import csv
from datetime import date
import yfinance as yf

def count_symbols(filename):
    with open(filename, 'r') as file:
        # Skip the header
        next(file)
        # Count the remaining lines
        return sum(1 for line in file)

def get_index_change(ticker):
    stock = yf.Ticker(ticker)
    hist = stock.history(period="5d")
    if len(hist) >= 2:
        yesterday_close = hist['Close'].iloc[-2]
        today_close = hist['Close'].iloc[-1]
        return (today_close - yesterday_close) / yesterday_close * 100
    else:
        return None

def generate_csv(file_names, output_file):
    today = date.today().isoformat()
    
    # Count symbols in each file
    symbol_counts = {file: count_symbols(file) for file in file_names}
    
    # Remove path and extension from file names
    file_names_short = [os.path.splitext(os.path.basename(file))[0] for file in file_names]
    
    # Get NASDAQ and SPY price changes and format to 2 decimal places
    nasdaq_change = get_index_change("^IXIC")
    spy_change = get_index_change("SPY")
    
    # Format to 2 decimal places if not None
    nasdaq_change = f"{nasdaq_change:.2f}" if nasdaq_change is not None else None
    spy_change = f"{spy_change:.2f}" if spy_change is not None else None
    
    # Check if the output file exists
    if os.path.exists(output_file):
        # Read existing data
        with open(output_file, 'r') as csvfile:
            reader = csv.reader(csvfile)
            existing_data = list(reader)
            
        # Check if today's date already exists
        if any(row[0] == today for row in existing_data):
            print(f"Data for {today} already exists in the history file. No changes made.")
            return
            
        # Append new row
        with open(output_file, 'a', newline='') as csvfile:
            writer = csv.writer(csvfile)
            writer.writerow([today, spy_change, nasdaq_change] + [symbol_counts[file] for file in file_names])
            
        print(f"New row for {today} has been appended to '{output_file}'.")
    else:
        # Create new file with header and data
        with open(output_file, 'w', newline='') as csvfile:
            writer = csv.writer(csvfile)
            
            # Write header
            writer.writerow(['Date', 'SPY', 'NASDAQ'] + file_names_short)
            
            # Write data
            writer.writerow([today, spy_change, nasdaq_change] + [symbol_counts[file] for file in file_names])
            
        print(f"New file '{output_file}' has been created with data for {today}.")

# Example usage
file_names = ['./market_sentiment_screens/results/52week_high_2_weeks.csv',
              './market_sentiment_screens/results/rsi_over_70.csv',
              './market_sentiment_screens/results/rsi_trending_up_stocks.csv',
              './market_sentiment_screens/results/52week_low_2_weeks.csv',
              './market_sentiment_screens/results/rsi_under_30.csv',
              './market_sentiment_screens/results/rsi_trending_down_stocks.csv',
              './market_sentiment_screens/results/52week_high_1_days.csv',
              './market_sentiment_screens/results/52week_low_1_days.csv']
output_file = './sentiment_history/sentiment_history.csv'

generate_csv(file_names, output_file)