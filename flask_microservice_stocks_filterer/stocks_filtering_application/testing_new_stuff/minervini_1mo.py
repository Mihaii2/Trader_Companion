import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def filter_stocks_minervini(file_path, output_file='minervini_1mo.csv'):
    """
    Filter stocks based on Minervini criteria and save the passing symbols to a CSV file.
    
    Criteria:
    1. Stock price is above both 150-day and 200-day moving averages
    2. The 150-day moving average is above the 200-day moving average
    3. The 200-day moving average line is trending up for at least 1 month
    4. The 50-day moving average is above both 150-day and 200-day moving averages
    5. Current stock price is at least 25% above its 52-week low
    6. Current stock price is within at least 25% of its 52-week high
    7. Current price is trading above the 50-day moving average
    """
    # Read the CSV file
    print(f"Reading data from {file_path}...")
    df = pd.read_csv(file_path)
    
    # Convert date column to datetime
    df['Date'] = pd.to_datetime(df['Date'])
    
    # Get unique symbols
    symbols = df['Symbol'].unique()
    print(f"Found {len(symbols)} unique stock symbols.")
    
    # List to store symbols that pass all filters
    passing_symbols = []
    
    # Process each symbol
    for i, symbol in enumerate(symbols):
        if (i + 1) % 50 == 0:
            print(f"Processing symbol {i+1}/{len(symbols)}: {symbol}")
        
        # Get data for the current symbol
        stock_data = df[df['Symbol'] == symbol].sort_values('Date')
        
        # Skip if we don't have enough data
        if len(stock_data) < 252:  # Approximately 1 year of trading days
            continue
        
        # Calculate moving averages
        stock_data['MA50'] = stock_data['Close'].rolling(window=50).mean()
        stock_data['MA150'] = stock_data['Close'].rolling(window=150).mean()
        stock_data['MA200'] = stock_data['Close'].rolling(window=200).mean()
        
        # Get the latest data point
        latest_data = stock_data.iloc[-1]
        
        # Get data from one month ago
        one_month_ago_date = latest_data['Date'] - timedelta(days=30)
        one_month_ago_idx = stock_data[stock_data['Date'] <= one_month_ago_date].index[-1]
        one_month_ago_data = stock_data.loc[one_month_ago_idx]
        
        # Calculate 52-week high and low
        year_data = stock_data.tail(252)
        low_52_week = year_data['Low'].min()
        high_52_week = year_data['High'].max()
        
        # Apply Minervini criteria
        try:
            # 1. Stock price is above both 150-day and 200-day moving averages
            condition1 = latest_data['Close'] > latest_data['MA150'] and latest_data['Close'] > latest_data['MA200']
            
            # 2. The 150-day moving average is above the 200-day moving average
            condition2 = latest_data['MA150'] > latest_data['MA200']
            
            # 3. The 200-day moving average line is trending up for at least 1 month
            condition3 = latest_data['MA200'] > one_month_ago_data['MA200']
            
            # 4. The 50-day moving average is above both 150-day and 200-day moving averages
            condition4 = latest_data['MA50'] > latest_data['MA150'] and latest_data['MA50'] > latest_data['MA200']
            
            # 5. Current stock price is at least 25% above its 52-week low
            condition5 = latest_data['Close'] >= low_52_week * 1.25
            
            # 6. Current stock price is within at least 25% of its 52-week high
            condition6 = latest_data['Close'] >= high_52_week * 0.75
            
            # 7. Current price is trading above the 50-day moving average
            condition7 = latest_data['Close'] > latest_data['MA50']
            
            # Check if all conditions are met
            all_conditions = condition1 and condition2 and condition3 and condition4 and condition5 and condition6 and condition7
            
            if all_conditions:
                passing_symbols.append(symbol)
                
        except Exception as e:
            print(f"Error processing {symbol}: {e}")
    
    # Save the results
    print(f"\nFound {len(passing_symbols)} stocks that pass all Minervini criteria.")
    result_df = pd.DataFrame({'Symbol': passing_symbols})
    result_df.to_csv(output_file, index=False)
    print(f"Results saved to {output_file}")
    
    return passing_symbols

if __name__ == "__main__":
    
    filtered_symbols = filter_stocks_minervini('../stock_api_data/nasdaq_stocks_1_year_price_data.csv', 'result.csv')
    
    # Print first few symbols that passed
    if filtered_symbols:
        print("\nFirst 10 passing symbols:")
        for symbol in filtered_symbols[:10]:
            print(symbol)