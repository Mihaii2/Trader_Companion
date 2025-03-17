import pandas as pd
import os
import numpy as np

def calculate_mvp_score(group):
    # Check if we have at least 15 days of data
    if len(group) < 15:
        return np.nan
    
    # Sort by date to ensure correct order
    group = group.sort_values('Date')
    
    # Get the last 15 days
    last_15_days = group.tail(15)
    
    # 1. Momentum: Check if the stock is up 12 out of 15 days
    # Calculate daily price changes
    last_15_days['Daily_Change'] = last_15_days['Close'].diff()
    # Count days with positive price movement
    positive_days = sum(last_15_days['Daily_Change'] > 0)
    momentum_check = positive_days >= 12
    
    # 2. Volume: Check if volume increased by 25% during the 15-day period
    # Calculate average volume for the past year
    avg_volume_year = group['Volume'].mean()
    # Calculate average volume for the last 15 days
    avg_volume_15_days = last_15_days['Volume'].mean()
    volume_increase = (avg_volume_15_days / avg_volume_year) - 1
    volume_check = volume_increase >= 0.25
    
    # 3. Price: Check if the stock price is up 20% or more during the 15-day period
    first_close = last_15_days['Close'].iloc[0]
    last_close = last_15_days['Close'].iloc[-1]
    price_percent_change = ((last_close / first_close) - 1) * 100
    price_check = price_percent_change >= 20
    
    # Return 1 if all conditions are met, 0 otherwise
    if momentum_check and volume_check and price_check:
        return 1
    else:
        return 0

# Get the absolute path of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Find the absolute path of the "flask_microservice_stocks_filterer" directory
while not script_dir.endswith("flask_microservice_stocks_filterer") and os.path.dirname(script_dir) != script_dir:
    script_dir = os.path.dirname(script_dir)

# Append the correct relative path to the input and output files
input_file = os.path.join(script_dir, "stocks_filtering_application", "minervini_4mo", "ranking_screens", "passed_stocks_input_data", "filtered_price_data.csv")
output_file = os.path.join(script_dir, "stocks_filtering_application", "minervini_4mo", "ranking_screens", "results", "mvp_stocks.csv")

# Read CSV with date parsing
df = pd.read_csv(input_file, parse_dates=['Date'])

# Group by symbol and calculate MVP score
mvp_scores = df.groupby('Symbol').apply(calculate_mvp_score)

# Filter to only include stocks that passed all criteria (score = 1)
passed_stocks = mvp_scores[mvp_scores == 1]

# Create a DataFrame with the results
result_df = pd.DataFrame({
    'Symbol': passed_stocks.index,
    'MVP': passed_stocks.values
})

# Write the results to the output CSV file
result_df.to_csv(output_file, index=False)

print(f"Stocks meeting MVP criteria have been saved to {output_file}")