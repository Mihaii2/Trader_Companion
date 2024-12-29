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
                    characteristics.add(characteristic)
                    
                    for row in reader:
                        if len(row) < 2:
                            print(f"Warning: Invalid row in '{filename}'. Skipping row.")
                            continue
                        symbol, value = row[:2]
                        data[symbol][characteristic] = value
            except Exception as e:
                print(f"Error processing file '{filename}': {str(e)}")

    if not data:
        print("No valid data found. Check your CSV files and directory path.")
        return

    # Sort all stocks by number of screeners
    sorted_data = sorted(
        data.items(),
        key=lambda item: len(item[1]),  # Sort by the number of characteristics
        reverse=True  # Descending order
    )

    # Write the top N symbols sorted by screener count
    output_filename = f'stocks_ranking_by_screeners.csv'
    with open(output_filename, 'w', newline='') as outfile:
        writer = csv.writer(outfile)
        
        # Write header
        header = ['Symbol', 'Screeners'] + list(characteristics)
        writer.writerow(header)
        
        # Write data for the top N symbols
        for symbol, char_dict in sorted_data[:top_n]:
            row = [symbol, len(char_dict)]
            for char in characteristics:
                row.append(char_dict.get(char, ''))
            writer.writerow(row)

    print(f"'{output_filename}' has been created.")

def main():
    parser = argparse.ArgumentParser(description='Process top N stocks by number of screeners')
    parser.add_argument('top_n', type=int, help='Number of top stocks to select')
    args = parser.parse_args()
    
    process_csv_files('./ranking_screens/results', args.top_n)

if __name__ == "__main__":
    main()