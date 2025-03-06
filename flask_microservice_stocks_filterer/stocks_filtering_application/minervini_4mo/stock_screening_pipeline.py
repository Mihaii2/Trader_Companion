import os
import subprocess
import sys
import logging
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

# Get the current script's directory
script_dir = os.path.dirname(os.path.abspath(__file__))
logs_dir = os.path.join(script_dir, "logs")
os.makedirs(logs_dir, exist_ok=True)

def setup_logging():
    log_file = os.path.join(logs_dir, "last_run.log")
    if os.path.exists(log_file):
        os.remove(log_file)
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file),
            logging.StreamHandler(sys.stdout)
        ]
    )
    return log_file

def parse_args():
    parser = argparse.ArgumentParser(description='Stock screening pipeline')
    parser.add_argument('price_increase', type=float, help='Minimum price increase percentage')
    parser.add_argument('--top-n', type=int, default=100, help='Number of top stocks to select')
    return parser.parse_args()

def run_script(script_path, args=None):
    command = [sys.executable, '-u', script_path]
    if args:
        command.extend(args)
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
    
    for line in process.stdout:
        logging.info(f"[{os.path.basename(script_path)}] {line.strip()}")
    for line in process.stderr:
        logging.error(f"[{os.path.basename(script_path)} ERROR] {line.strip()}")
    
    process.wait()
    return process.returncode

def run_scripts_in_parallel(scripts, price_increase=None):
    with ThreadPoolExecutor() as executor:
        futures = [
            executor.submit(run_script, script, [str(price_increase)] if 'minimum_price_increase.py' in script else None)
            for script in scripts
        ]
        for future in as_completed(futures):
            future.result()

def get_dirs_to_cleanup():
    return [
        os.path.join(script_dir, "ranking_screens", "results"),
        os.path.join(script_dir, "obligatory_screens", "results")
    ]

def find_csv_files(directories):
    csv_files = []
    for directory in directories:
        if os.path.exists(directory):
            for root, _, files in os.walk(directory):
                for file in files:
                    if file.lower().endswith('.csv'):
                        csv_files.append(os.path.join(root, file))
    return csv_files

def delete_file(file_path):
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
    except Exception as e:
        logging.error(f"Error deleting {file_path}: {e}")

def main():
    setup_logging()
    args = parse_args()
    logging.info("Starting stock screening pipeline")
    
    obligatory_screens = [
        os.path.join(script_dir, "obligatory_screens", f"{name}.py")
        for name in ["above_52week_low", "trending_up", "close_to_52week_high", "minimum_volume_100k", "minimum_price_increase"]
    ]
    ranking_screens = [
        os.path.join(script_dir, "ranking_screens", f"{name}.py")
        for name in ["top_price_increases_1y", "price_spikes", "volume_acceleration"]
    ]
    
    logging.info("Finding and deleting old CSV files...")
    dirs_to_cleanup = get_dirs_to_cleanup()
    csv_files = find_csv_files(dirs_to_cleanup)
    logging.info(f"Found {len(csv_files)} CSV files to delete")
    for file_path in csv_files:
        logging.info(f"Deleting: {os.path.basename(file_path)}")
        delete_file(file_path)
    
    run_scripts_in_parallel(obligatory_screens, args.price_increase)
    
    run_script(os.path.join(script_dir, "obligatory_screens", "obligatory_screen_passer.py"))
    
    run_script(os.path.join(script_dir, "banned_stocks", "banned_filter.py"))
    
    run_script(os.path.join(script_dir, "ranking_screens", "passed_stocks_input_data", "obligatory_screen_data_filter.py"))
    
    run_scripts_in_parallel(ranking_screens)
    
    if args.top_n:
        run_script(os.path.join(script_dir, "top_n_stocks_by_price_increase.py"), [str(args.top_n)])
        run_script(os.path.join(script_dir, "top_n_stocks_by_nr_screeners.py"), [str(args.top_n)])
    
    logging.info("Stock screening pipeline completed successfully.")

if __name__ == "__main__":
    main()
