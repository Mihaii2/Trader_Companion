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
    # Reduce to last 120 trading days
    last_four_months = group.iloc[-120:]
    
    if len(last_four_months) < 120:
        return False  # Not enough data
    
    # Check if 200MA is trending up over 4 months
    ma_start = last_four_months['200MA'].iloc[0]
    ma_end = last_four_months['200MA'].iloc[-1]
    
    return ma_end > ma_start



def main():
    import os

    # Get the absolute path of the current script
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Find the absolute path of the "flask_microservice_stocks_filterer" directory
    while not script_dir.endswith("flask_microservice_stocks_filterer") and os.path.dirname(script_dir) != script_dir:
        script_dir = os.path.dirname(script_dir)

    # Define the input and output file paths
    input_file = os.path.join(script_dir, "stocks_filtering_application", "price_data", "all_tickers_historical.csv")
    output_file = os.path.join(script_dir, "stocks_filtering_application", "minervini_4mo", "obligatory_screens", "results", "trending_up_stocks.csv")

    print(f"Resolved input file path: {input_file}")
    print(f"Resolved output file path: {output_file}")
    # Read the CSV file
    df = pd.read_csv(input_file, parse_dates=['Date'])
    
    # Group the data by stock symbol
    grouped = df.groupby('Symbol')
    
    qualifying_symbols = []
    
    for symbol, group in grouped:
        # Print data for 'LX' symbol to debug
        if symbol == 'LX':
            print(f"\n{'='*50}")
            print(f"FOUND SYMBOL LX - ANALYZING DATA")
            print(f"{'='*50}")
            
            # Sort by date
            group = group.sort_values('Date')
            
            # Calculate moving averages
            group['200MA'] = calculate_ma(group, 200)
            group['150MA'] = calculate_ma(group, 150)
            group['50MA'] = calculate_ma(group, 50)
            
            # Print key information
            print(f"Number of data points: {len(group)}")
            if len(group) < 200:
                print("ISSUE: Not enough data points (need at least 200)")
            
            last_row = group.iloc[-1]
            print(f"Last data date: {last_row['Date']}")
            print(f"Close price: {last_row['Close']}")
            print(f"50-day MA: {last_row['50MA']}")
            print(f"150-day MA: {last_row['150MA']}")
            print(f"200-day MA: {last_row['200MA']}")
            
            # Print condition checks
            print("\nChecking conditions:")
            conditions = [
                f"150MA > 200MA: {last_row['150MA'] > last_row['200MA']}",
                f"50MA > 150MA: {last_row['50MA'] > last_row['150MA']}",
                f"Close > 50MA: {last_row['Close'] > last_row['50MA']}",
                f"Close > 150MA: {last_row['Close'] > last_row['150MA']}",
                f"Close > 200MA: {last_row['Close'] > last_row['200MA']}"
            ]
            
            for condition in conditions:
                print(condition)
            
            # Check 200MA trending up
            last_four_months = group.iloc[-120:]
            print(f"\n200MA Trend Check:")
            print(f"Have 120 days of data: {len(last_four_months) >= 120}")
            
            if len(last_four_months) >= 120:
                ma_start = last_four_months['200MA'].iloc[0]
                ma_end = last_four_months['200MA'].iloc[-1]
                print(f"Start 200MA (4 months ago): {ma_start}")
                print(f"End 200MA (current): {ma_end}")
                print(f"Is increasing: {ma_end > ma_start}")
                print(f"Is monotonically increasing: {last_four_months['200MA'].is_monotonic_increasing}")
                
            # Check if it qualifies
            qualifies = check_conditions(group)
            print(f"\nQualifies for trending up: {qualifies}")
            print(f"{'='*50}\n")
        else:
            # Regular processing for other symbols
            group = group.sort_values('Date')
            group['200MA'] = calculate_ma(group, 200)
            group['150MA'] = calculate_ma(group, 150)
            group['50MA'] = calculate_ma(group, 50)
        
        # Check all conditions
        if check_conditions(group):
            qualifying_symbols.append(symbol)
    
    # Save the symbols to a new CSV file
    pd.DataFrame({'Symbol': qualifying_symbols}).to_csv(output_file, index=False)
    print(f"Trending up analysis complete. Saved {len(qualifying_symbols)} symbols to {output_file}")
    
    # Check if LX is in the results
    if 'LX' in qualifying_symbols:
        print("LX is in the qualifying symbols list!")
    else:
        print("LX is NOT in the qualifying symbols list.")

if __name__ == "__main__":
    main()