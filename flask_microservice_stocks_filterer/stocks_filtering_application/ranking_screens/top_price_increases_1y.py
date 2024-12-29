import pandas as pd
import numpy as np

def calculate_price_increase(group):
    year_high = group['High'].max()
    year_low = group['Low'].min()
    return (year_high - year_low) / year_low * 100

# Read the input CSV file
input_file = './ranking_screens/passed_stocks_input_data/filtered_price_data.csv'
output_file = './ranking_screens/results/top_price_increase_1y.csv'

df = pd.read_csv(input_file, parse_dates=['Date'])

# Group by symbol and calculate price increase
price_increases = df.groupby('Symbol').apply(calculate_price_increase)

# Sort price increases in descending order
top_100 = price_increases.sort_values(ascending=False)

# Create a DataFrame with the results
result_df = pd.DataFrame({
    'Symbol': top_100.index,
    'Price_Increase_Percentage': top_100.values
})

# Write the results to the output CSV file
result_df.to_csv(output_file, index=False)

print(f"Top 100 stocks by price increase have been saved to {output_file}")