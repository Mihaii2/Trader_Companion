import pandas as pd
from datetime import datetime, timedelta

def get_stocks_with_52week_low(file_path, output_file):
    # Read the CSV file
    df = pd.read_csv(file_path, parse_dates=['Date'])
    
    # Sort the dataframe by Date
    df = df.sort_values('Date')
    
    # Get the most recent date in the dataset
    last_date = df['Date'].max()
    
    # Define the date range for two weeks ago
    two_weeks_ago = last_date - timedelta(days=14)
    
    # Group the data by stock symbol
    grouped = df.groupby('Symbol')
    
    # List to store symbols that hit 52-week low in the last two weeks
    symbols_with_52week_low = []
    
    for symbol, group in grouped:
        # Get data for the last year
        last_year_data = group[group['Date'] >= last_date - timedelta(days=365)]
        
        # Get data for the last two weeks
        last_two_weeks_data = group[group['Date'] >= two_weeks_ago]
        
        # Check if the stock hit a 52-week low in the last two weeks
        if last_two_weeks_data['Low'].min() <= last_year_data['Low'].min():
            symbols_with_52week_low.append(symbol)
    
    # Save the results to a new CSV file
    pd.DataFrame(symbols_with_52week_low, columns=['Symbol']).to_csv(output_file, index=False)
    
    print(f"Saved {len(symbols_with_52week_low)} symbols to {output_file}")

# Usage
input_file = './stock_api_data/nasdaq_stocks_1_year_price_data.csv'
output_file = './market_sentiment_screens/results/52week_low_2_weeks.csv'
get_stocks_with_52week_low(input_file, output_file)
