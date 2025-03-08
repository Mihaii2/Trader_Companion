import csv

def filter_stock_data(stocks_to_screen_file, all_stocks_data_file, output_file):
    # Read the stocks to screen
    with open(stocks_to_screen_file, 'r') as f:
        reader = csv.reader(f)
        next(reader)  # Skip header
        stocks_to_screen = set(row[0] for row in reader)

    # Read all stocks data and write filtered data to output file
    with open(all_stocks_data_file, 'r') as input_file, open(output_file, 'w', newline='') as output_file:
        reader = csv.reader(input_file)
        writer = csv.writer(output_file)

        # Write header and find Symbol column index
        header = next(reader)
        writer.writerow(header)
        try:
            symbol_index = header.index('Symbol')
        except ValueError:
            print(f"Error: 'Symbol' column not found in {all_stocks_data_file}")
            return

        # Filter and write data
        for row in reader:
            if row[symbol_index] in stocks_to_screen:
                writer.writerow(row)

    print(f"Filtered data has been written to {output_file}")

# Usage
import os

# Get the absolute path of the current script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Find the absolute path of the "flask_microservice_stocks_filterer" directory
while not script_dir.endswith("flask_microservice_stocks_filterer") and os.path.dirname(script_dir) != script_dir:
    script_dir = os.path.dirname(script_dir)

# Define the file paths dynamically
stocks_to_screen_file = os.path.join(script_dir, "stocks_filtering_application", "minervini_1mo", "banned_stocks", "stocks_not_banned.csv")

all_stocks_data_file1 = os.path.join(script_dir, "stocks_filtering_application", "stock_api_data", "annual_fundamental_data_2years.csv")
output_file1 = os.path.join(script_dir, "stocks_filtering_application", "minervini_1mo", "ranking_screens", "passed_stocks_input_data", "filtered_annual_fundamental_data_2years.csv")

all_stocks_data_file2 = os.path.join(script_dir, "stocks_filtering_application", "stock_api_data", "quarterly_fundamental_data_2years.csv")
output_file2 = os.path.join(script_dir, "stocks_filtering_application", "minervini_1mo", "ranking_screens", "passed_stocks_input_data", "filtered_quarterly_fundamental_data_2years.csv")

all_stocks_data_file3 = os.path.join(script_dir, "stocks_filtering_application", "stock_api_data", "nasdaq_stocks_1_year_price_data.csv")
output_file3 = os.path.join(script_dir, "stocks_filtering_application", "minervini_1mo", "ranking_screens", "passed_stocks_input_data", "filtered_price_data.csv")


filter_stock_data(stocks_to_screen_file, all_stocks_data_file1, output_file1)
filter_stock_data(stocks_to_screen_file, all_stocks_data_file2, output_file2)
filter_stock_data(stocks_to_screen_file, all_stocks_data_file3, output_file3)