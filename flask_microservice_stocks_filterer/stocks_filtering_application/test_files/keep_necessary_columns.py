import pandas as pd

# Read the CSV file
df = pd.read_csv('nasdaq_stocks_1_year_data.csv')

# Select only the desired columns
df_selected = df[['Date', 'High', 'Low', 'Close', 'Volume', 'Symbol']]

# Round the float columns to 2 decimal places
float_columns = ['High', 'Low', 'Close']
df_selected[float_columns] = df_selected[float_columns].round(2)

# Convert Volume to integer (assuming it should always be a whole number)
df_selected['Volume'] = df_selected['Volume'].astype(int)

# Save the result to a new CSV file
df_selected.to_csv('stocks_neccesary_columns.csv', index=False)

print("Processing complete. Data saved to 'output.csv'.")

# Optionally, display the first few rows of the processed data
print("\nFirst few rows of the processed data:")
print(df_selected.head())