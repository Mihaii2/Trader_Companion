import pandas as pd
import numpy as np

# Custom function to handle percentage change with negative EPS values
def calculate_pct_change(previous, current):
    if previous == 0:
        # Avoid division by zero, return NaN or a large arbitrary value
        return np.nan if current == 0 else np.sign(current) * np.inf
    else:
        # Use standard percentage change formula
        return (current - previous) / abs(previous) * 100

# Read the input CSV file
input_file = './ranking_screens/passed_stocks_input_data/filtered_annual_fundamental_data_2years.csv'
df = pd.read_csv(input_file)

# Drop rows where EPS is missing (NaN)
df = df.dropna(subset=['EPS'])

# Sort by Symbol and Date to ensure correct order
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values(by=['Symbol', 'Date'])

# Group by stock symbol
grouped = df.groupby('Symbol')

# List to store results
filtered_stocks = []

# Iterate over each stock's data
for symbol, group in grouped:
    # Create a new column for EPS Growth based on custom calculation
    eps_growth = [np.nan]  # First value will have no previous EPS to compare with, so NaN
    for prev, curr in zip(group['EPS'][:-1], group['EPS'][1:]):
        eps_growth.append(calculate_pct_change(prev, curr))
    
    group['EPS Growth'] = eps_growth
        # Calculate average growth, ignoring NaNs
    if(len(group['EPS Growth']) <= 1):
        continue
    avg_growth = np.nanmean(group['EPS Growth'])
    
    # Check if average growth is at least 10%
    if avg_growth >= 20:
        filtered_stocks.append({
            'Symbol': symbol,
            'EPS-Increase(%)': avg_growth
        })

# Create DataFrame of filtered stocks
filtered_df = pd.DataFrame(filtered_stocks)

# Save the filtered data to a new CSV file
output_file = './ranking_screens/results/annual_EPS_acceleration_stocks.csv'
filtered_df.to_csv(output_file, index=False)

print(f"{len(filtered_stocks)} stocks with annual EPS acceleration >= 20% saved to {output_file}")
