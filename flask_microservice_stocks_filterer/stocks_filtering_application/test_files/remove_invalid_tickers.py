import re
import csv

def validate_tickers(tickers):
    pattern = re.compile(r'^[A-Z]+$')
    valid_tickers = [ticker for ticker in tickers if pattern.match(ticker)]
    return valid_tickers

def read_tickers_from_csv(file_path):
    tickers = []
    with open(file_path, 'r') as csvfile:
        csv_reader = csv.reader(csvfile)
        for row in csv_reader:
            if row:  # Check if the row is not empty
                tickers.append(row[0].strip())  # Assume ticker is in the first column
    return tickers

# File path
file_path = 'nasdaq_stocks.csv'

# Read tickers from CSV
tickers = read_tickers_from_csv(file_path)

# Validate tickers
valid_tickers = validate_tickers(tickers)

print("Valid tickers:", valid_tickers)

# Optionally, write valid tickers back to a new CSV file
output_file = 'valid_tickers.csv'
with open(output_file, 'w', newline='') as csvfile:
    csv_writer = csv.writer(csvfile)
    for ticker in valid_tickers:
        csv_writer.writerow([ticker])

print(f"Valid tickers have been written to {output_file}")