import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def calculate_ma(data, window):
    return data['Close'].rolling(window=window).mean()

def check_conditions(group):
    # Check if we have enough data
    if len(group) < 200:
        return False

    # Get the last row of data
    last_row = group.iloc[-1]

    # Check all conditions
    conditions = [
        last_row['150MA'] > last_row['200MA'],
        last_row['50MA'] > last_row['150MA'],
        last_row['Close'] > last_row['50MA'],
        last_row['Close'] > last_row['150MA'],
        last_row['Close'] > last_row['200MA'],
        is_200ma_trending_up(group)
    ]

    return all(conditions)

def is_200ma_trending_up(group):
    # Get the last 30 days of data
    last_month = group.iloc[-30:]
    
    if len(last_month) < 30:
        return False  # Not enough data
    
    # Check if 200MA is trending up in the last month
    ma_start = last_month['200MA'].iloc[0]
    ma_end = last_month['200MA'].iloc[-1]
    
    return ma_end > ma_start and last_month['200MA'].is_monotonic_increasing

def main():
    # Read the CSV file
    df = pd.read_csv('../stock_api_data/nasdaq_stocks_1_year_price_data.csv', parse_dates=['Date'])
    
    # Group the data by stock symbol
    grouped = df.groupby('Symbol')
    
    qualifying_symbols = []
    
    for symbol, group in grouped:
        # Sort by date
        group = group.sort_values('Date')
        
        # Calculate moving averages
        group['200MA'] = calculate_ma(group, 200)
        group['150MA'] = calculate_ma(group, 150)
        group['50MA'] = calculate_ma(group, 50)
        
        # Check all conditions
        if check_conditions(group):
            qualifying_symbols.append(symbol)
    
    # Save the symbols to a new CSV file
    pd.DataFrame({'Symbol': qualifying_symbols}).to_csv('./obligatory_screens/results/trending_up_stocks.csv', index=False)
    print(f"Trending up analysis complete. Saved {len(qualifying_symbols)} symbols to ./obligatory_screens/results/trending_up_stocks.csv")

if __name__ == "__main__":
    main()