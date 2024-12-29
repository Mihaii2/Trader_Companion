import pandas as pd
import numpy as np

def calculate_rsi(data, periods=14):
    close_delta = data['Close'].diff()

    # Make two series: one for lower closes and one for higher closes
    up = close_delta.clip(lower=0)
    down = -1 * close_delta.clip(upper=0)
    
    # Calculate the EWMA
    ma_up = up.ewm(com=periods-1, adjust=True, min_periods=periods).mean()
    ma_down = down.ewm(com=periods-1, adjust=True, min_periods=periods).mean()

    rsi = ma_up / ma_down
    rsi = 100 - (100 / (1 + rsi))
    return rsi

def rsi_trending_down(rsi_series, window, trend_threshold=0.7):
    # Calculate a rolling mean (trend) of the RSI
    rsi_ma = rsi_series.rolling(window=window).mean()

    # Check if RSI trend is moving downward (comparing each value to the previous)
    downward_trend = (rsi_ma.diff() < 0).sum()  # Count how many times RSI trend is moving down
    
    # We want at least 'trend_threshold' % of the rolling window period to show a downward trend
    valid_periods = len(rsi_ma.dropna())
    if valid_periods == 0:
        return False  # If there are no valid periods, we can't determine a trend
    
    downward_proportion = downward_trend / valid_periods
    
    return downward_proportion >= trend_threshold and rsi_ma.iloc[-1] < rsi_ma.iloc[window]

# Read the CSV file
df = pd.read_csv('./stock_api_data/nasdaq_stocks_1_year_price_data.csv', parse_dates=['Date'])

# Initialize an empty list to store the results
result = []

# Define number of trading days in a month (assuming 21 days per month)
days_in_month = 21

# Define the window size for the RSI trend calculation
window = 30

# Group by Symbol and calculate RSI
for symbol, group in df.groupby('Symbol'):
    group = group.sort_values('Date')  # Ensure data is sorted by date
    group['RSI'] = calculate_rsi(group)

    # Check if RSI has been trending down using a rolling average for the last month
    months_trending_down = 0
    for i in range(1, int((len(group) - window)/days_in_month)):  # Loop over months
        start_idx = -i * days_in_month
        end_idx = -(i - 1) * days_in_month if i > 1 else None

        # Get the RSI for the last 'days_in_month' days (1 month)
        rsi_last_month = group['RSI'].iloc[start_idx - window:end_idx]

        # Check if RSI has been trending down in the last month
        if rsi_trending_down(rsi_last_month, window=window):
            months_trending_down += 1
        else:
            break  # If trend breaks, stop counting months

    # Only save the ticker if RSI has been trending down for at least 1 month
    if months_trending_down >= 1:
        result.append({'Symbol': symbol, 'MonthsTrendingDown': months_trending_down})

# Convert the result into a DataFrame and save it to a CSV
result_df = pd.DataFrame(result)
result_df.to_csv('./market_sentiment_screens/results/rsi_trending_down_stocks.csv', index=False)

print(f"Saved {len(result)} stocks whose RSI has been trending down for at least 1 month to './ranking_screens/results/rsi_trending_down_stocks.csv'")
