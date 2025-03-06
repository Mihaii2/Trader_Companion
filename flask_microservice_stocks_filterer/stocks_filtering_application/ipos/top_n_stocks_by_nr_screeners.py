import csv
import os
from collections import defaultdict
import argparse

def process_csv_files(directory, top_n):
    # Dictionary to store all data
    data = defaultdict(dict)
    characteristics = set()

    # Process all CSV files in the directory
    for filename in os.listdir(directory):
        if filename.endswith('.csv'):
            file_path = os.path.join(directory, filename)
            try:
                with open(file_path, 'r') as file:
                    reader = csv.reader(file)
                    header = next(reader, None)
                    
                    if not header or len(header) < 2:
                        print(f"Warning: File '{filename}' has an invalid header. Skipping.")
                        continue
                    
                    characteristic = header[1]
                    characteristics.add(characteristic)  # Store characteristic even if file is empty

                    has_data = False
                    for row in reader:
                        if len(row) < 2:
                            print(f"Warning: Invalid row in '{filename}'. Skipping row.")
                            continue
                        symbol, value = row[:2]
                        data[symbol][characteristic] = value
                        has_data = True

                    # If no valid data rows, ensure the characteristic exists with empty values
                    if not has_data:
                        for symbol in data.keys():  # Ensure existing symbols have an empty column
                            data[symbol][characteristic] = ''
            except Exception as e:
                print(f"Error processing file '{filename}': {str(e)}")

    if not data:
        print("No valid data found. Check your CSV files and directory path.")
        return

    # Ensure all symbols appear even if they have no data
    all_symbols = set(data.keys())

    # Sort all stocks by number of screeners (characteristics they match)
    sorted_data = sorted(
        [(symbol, data.get(symbol, {})) for symbol in all_symbols],
        key=lambda item: len(item[1]),  # Sort by the number of characteristics
        reverse=True  # Descending order
    )

    # Write the final CSV file
    output_filename = 'stocks_ranking_by_screeners.csv'
    with open(output_filename, 'w', newline='') as outfile:
        writer = csv.writer(outfile)
        
        # Write header ensuring all characteristics appear
        header = ['Symbol', 'Screeners'] + list(characteristics)
        writer.writerow(header)
        
        # Write data for the top N symbols
        for symbol, char_dict in sorted_data[:top_n]:
            row = [symbol, len(char_dict)]
            for char in characteristics:
                row.append(char_dict.get(char, ''))  # Ensure empty columns exist
            writer.writerow(row)

    print(f"'{output_filename}' has been created.")

def main():
    parser = argparse.ArgumentParser(description='Process top N stocks by number of screeners')
    parser.add_argument('top_n', type=int, help='Number of top stocks to select')
    args = parser.parse_args()
    
    process_csv_files('./ranking_screens/results', args.top_n)

if __name__ == "__main__":
    main()
