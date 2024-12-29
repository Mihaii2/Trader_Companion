import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

# Create a Ticker object for Apple
apple = yf.Ticker("ACM")

#ACONW
#ALSAW

# Calculate the date range for the last 2 years
end_date = datetime.now()
start_date = end_date - timedelta(days=2*365)

# Get quarterly financial data
quarterly_data = apple.quarterly_income_stmt
price_data = apple.history(start=start_date, end=end_date)
estimates = apple.eps_revisions
print(estimates)

# Filter the data for the last 2 years
# filtered_data = quarterly_data.loc[:, (quarterly_data.columns >= start_date) & (quarterly_data.columns <= end_date)]

# Display the filtered data
# print(quarterly_data)
# print(apple.quarterly_balance_sheet)
# print(apple._earnings_dates)

# Optionally, save the data to a CSV file
estimates.to_csv("./test_files/apple_quarterly_data.csv")
price_data.to_csv("./test_files/apple_price_data.csv")