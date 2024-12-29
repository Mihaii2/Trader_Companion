import pandas as pd
from datetime import datetime, timedelta

def get_stocks_with_52week_high(file_path, output_file):
    # Read the CSV file
    df = pd.read_csv(file_path, parse_dates=['Date'])
    
    # Sort the dataframe by Date
    df = df.sort_values('Date')
    
    # Get the date one month ago from the most recent date
    last_date = df['Date'].max()
    two_weeks_ago = last_date - timedelta(days=14)
    
    # Group the data by stock symbol
    grouped = df.groupby('Symbol')
    
    # List to store symbols that hit 52-week high in the last 2 weeks
    symbols_with_52week_high = []
    
    for symbol, group in grouped:
        # Get data for the last year
        last_year_data = group[group['Date'] >= last_date - timedelta(days=365)]
        
        # Get data for the last 2 weeks
        last_month_data = group[group['Date'] >= two_weeks_ago]
        
        # Check if the stock hit a 52-week high in the last 2 weeks
        if last_month_data['High'].max() >= last_year_data['High'].max():
            symbols_with_52week_high.append(symbol)
    
    # Save the results to a new CSV file
    pd.DataFrame(symbols_with_52week_high, columns=['Symbol']).to_csv(output_file, index=False)
    
    print(f"Saved {len(symbols_with_52week_high)} symbols to {output_file}")

# Usage
input_file = './stock_api_data/nasdaq_stocks_1_year_price_data.csv'
output_file = './market_sentiment_screens/results/52week_high_2_weeks.csv'
get_stocks_with_52week_high(input_file, output_file)