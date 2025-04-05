import pandas as pd
import os
import numpy as np
from datetime import datetime, timedelta

def calculate_mvp_score_for_window(window):
    """Calculate MVP score for a 15-day window"""
    if len(window) < 15:
        return 0
    
    # Sort by date to ensure correct order
    window = window.sort_values('Date')
    
    # Calculate daily price changes
    window['Daily_Change'] = window['Close'].diff()
    
    # 1. Momentum: Check if the stock is up 12 out of 15 days
    positive_days = sum(window['Daily_Change'] > 0)
    momentum_check = positive_days >= 12
    
    # 2. Volume: Check if volume increased by 25% during the 15-day period
    # We're using the whole group's volume as the reference (passing it as a parameter)
    avg_volume_window = window['Volume'].mean()
    avg_volume_reference = group['Volume'].mean()  # Assuming 'group' is accessible
    volume_increase = (avg_volume_window / avg_volume_reference) - 1
    volume_check = volume_increase >= 0.25
    
    # 3. Price: Check if the stock price is up 20% or more during the 15-day period
    first_close = window['Close'].iloc[0]
    last_close = window['Close'].iloc[-1]
    price_percent_change = ((last_close / first_close) - 1) * 100
    price_check = price_percent_change >= 20
    
    # Return 1 if all conditions are met, 0 otherwise
    if momentum_check and volume_check and price_check:
        return 1
    else:
        return 0

def check_mvp_criteria_in_period(group, lookback_days=180):
    """Check if the stock met MVP criteria at least once in the lookback period"""
    # Sort by date to ensure correct order
    group = group.sort_values('Date')
    
    # Calculate the date cutoff (6 months ago)
    latest_date = group['Date'].max()
    cutoff_date = latest_date - pd.Timedelta(days=lookback_days)
    
    # Filter for the lookback period
    period_data = group[group['Date'] >= cutoff_date]
    
    if len(period_data) < 15:  # Not enough data in the period
        return 0
    
    # Sliding window approach: check each possible 15-day window in the lookback period
    met_criteria = False
    
    for start_idx in range(len(period_data) - 14):
        window = period_data.iloc[start_idx:start_idx + 15]
        
        # Skip if window doesn't have exactly 15 days
        if len(window) != 15:
            continue
            
        # Calculate MVP score for this window
        score = calculate_mvp_score_for_window(window)
        
        if score == 1:
            met_criteria = True
            break
    
    return 1 if met_criteria else 0

# Get the absolute path of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Find the absolute path of the "flask_microservice_stocks_filterer" directory
while not script_dir.endswith("flask_microservice_stocks_filterer") and os.path.dirname(script_dir) != script_dir:
    script_dir = os.path.dirname(script_dir)

# Append the correct relative path to the input and output files
input_file = os.path.join(script_dir, "stocks_filtering_application", "minervini_4mo", "ipos", "passed_stocks_input_data", "filtered_price_data.csv")
output_file = os.path.join(script_dir, "stocks_filtering_application", "minervini_4mo", "ipos", "results", "mvp_stocks_6mo.csv")

# Read CSV with date parsing
df = pd.read_csv(input_file, parse_dates=['Date'])

# Group by symbol and check for MVP criteria in the lookback period
results = []

for symbol, group in df.groupby('Symbol'):
    mvp_score = check_mvp_criteria_in_period(group, lookback_days=180)  # 180 days = ~6 months
    if mvp_score == 1:
        results.append({'Symbol': symbol, 'MVP_Last_6Mo': 1})

# Create a DataFrame with the results
result_df = pd.DataFrame(results)

# Write the results to the output CSV file
result_df.to_csv(output_file, index=False)

print(f"Stocks meeting MVP criteria at least once in the last 6 months have been saved to {output_file}")