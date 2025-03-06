import csv
import os
from collections import defaultdict
import argparse

def process_csv_files(directory, top_n):
    # Dictionary to store all data
    data = defaultdict(dict)
    characteristics = set()
    price_increases = {}

    # First, read the price increase data
    price_increase_file = os.path.join(directory, 'top_price_increase_1y.csv')
    try:
        with open(price_increase_file, 'r') as file:
            reader = csv.reader(file)
            next(reader)  # Skip header
            for row in reader:
                if len(row) >= 2:
                    symbol, increase = row[:2]
                    try:
                        price_increases[symbol] = float(increase)
                    except ValueError:
                        print(f"Warning: Invalid price increase value for {symbol}. Skipping.")
    except Exception as e:
        print(f"Error processing top_price_increase_1y.csv: {str(e)}")
        return

    # Process all other CSV files in the directory
    for filename in os.listdir(directory):
        if filename.endswith('.csv') and filename != 'top_price_increase_1y.csv':
            file_path = os.path.join(directory, filename)
            try:
                with open(file_path, 'r') as file:
                    reader = csv.reader(file)
                    header = next(reader, None)
                    
                    if not header or len(header) < 2:
                        print(f"Warning: File '{filename}' has an invalid header. Skipping.")
                        continue
                    
                    characteristic = header[1]
                    characteristics.add(characteristic)
                    
                    for row in reader:
                        if len(row) < 2:
                            print(f"Warning: Invalid row in '{filename}'. Skipping row.")
                            continue
                        symbol, value = row[:2]
                        data[symbol][characteristic] = value
            except Exception as e:
                print(f"Error processing file '{filename}': {str(e)}")

    if not data or not price_increases:
        print("No valid data found. Check your CSV files and directory path.")
        return

    # Create a list of all symbols that have either characteristics or price increases
    all_symbols = set(data.keys()) | set(price_increases.keys())
    # Prepare data for writing (sort by price increase)

    # Prepare data for writing (sort by price increase)
    sorted_data = sorted(
        [(symbol, data.get(symbol, {})) for symbol in all_symbols],
        key=lambda item: price_increases.get(item[0], 0),
        reverse=True
    )

    # Write the top N symbols with the highest price increase to a new CSV file
    output_filename = f'stocks_ranking_by_price.csv'
    with open(output_filename, 'w', newline='') as outfile:
        writer = csv.writer(outfile)
        
        # Write header
        header = ['Symbol', 'Price_Increase_Percentage', 'Screeners'] + list(characteristics)
        writer.writerow(header)
        
        # Write data for the top N symbols
        for symbol, char_dict in sorted_data[:top_n]:
            row = [symbol, price_increases.get(symbol, ''), len(char_dict)]
            for char in characteristics:
                row.append(char_dict.get(char, ''))
            writer.writerow(row)

    print(f"'{output_filename}' has been created.")

def main():
    parser = argparse.ArgumentParser(description='Process top N stocks by price increase')
    parser.add_argument('top_n', type=int, help='Number of top stocks to select')
    args = parser.parse_args()
    
    process_csv_files('./ranking_screens/results', args.top_n)

if __name__ == "__main__":
    main()