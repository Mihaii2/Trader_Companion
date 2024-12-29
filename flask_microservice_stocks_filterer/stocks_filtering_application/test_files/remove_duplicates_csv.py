import csv

def remove_duplicates(input_file, output_file):
    # Read the input CSV file and store unique symbols
    unique_symbols = set()
    with open(input_file, 'r') as file:
        reader = csv.reader(file)
        header = next(reader)  # Read the header
        for row in reader:
            unique_symbols.add(row[0])  # Assuming the symbol is in the first column

    # Write the unique symbols to the output CSV file
    with open(output_file, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(header)  # Write the header
        for symbol in sorted(unique_symbols):
            writer.writerow([symbol])

# Example usage
input_file = 'stocks.csv'
output_file = 'stocks_no_duplicates.csv'
remove_duplicates(input_file, output_file)
print(f"Duplicates removed. Result saved to {output_file}")