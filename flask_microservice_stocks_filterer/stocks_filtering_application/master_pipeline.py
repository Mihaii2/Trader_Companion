import os
import subprocess
import sys
import logging
import time
import platform
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pipeline_status import PipelineStatus

# Get the current script's directory
script_dir = os.path.dirname(os.path.abspath(__file__))
logs_dir = os.path.join(script_dir, "logs")
os.makedirs(logs_dir, exist_ok=True)

# Define pipeline paths
PIPELINE_PATHS = [
    "./minervini_1mo/stock_screening_pipeline.py",
    "./minervini_4mo/stock_screening_pipeline.py",
    "./ipos/stock_screening_pipeline.py"
]

# Define paths
fetch_data_script = os.path.join(script_dir, "./price_1y_fundamental_2y.py")  # Modify if needed

# Set up logging
def setup_logging():
    log_file = os.path.join(logs_dir, "master_pipeline.log")
    if os.path.exists(log_file):
        os.remove(log_file)
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(levelname)s - %(message)s",
        handlers=[logging.FileHandler(log_file), logging.StreamHandler(sys.stdout)]
    )

# Put computer to sleep
def put_computer_to_sleep():
    system = platform.system().lower()
    try:
        if system == "windows":
            os.system("rundll32.exe powrprof.dll,SetSuspendState 0,1,0")
        elif system == "darwin":  # macOS
            os.system("pmset sleepnow")
        elif system == "linux":
            os.system("systemctl suspend")
        else:
            logging.error(f"Sleep not supported on {system}")
            return False
        return True
    except Exception as e:
        logging.error(f"Failed to put computer to sleep: {e}")
        return False

# Run a script and log output
def run_script(script_path, args=None):
    script_path = os.path.abspath(script_path)  # Convert to absolute path
    pipeline_dir = os.path.dirname(script_path)  # Get the pipeline folder

    # Check if the script exists
    if not os.path.exists(script_path):
        logging.error(f"Pipeline script not found: {script_path}")
        return 1

    command = [sys.executable, "-u", os.path.basename(script_path)]
    if args:
        command.extend(map(str, args))

    logging.info(f"Running {script_path} in {pipeline_dir}")

    # Change to pipeline directory and run script
    original_cwd = os.getcwd()
    try:
        os.chdir(pipeline_dir)
        process = subprocess.Popen(
            command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True
        )

        for line in process.stdout:
            logging.info(f"[{os.path.basename(script_path)}] {line.strip()}")
        for line in process.stderr:
            logging.error(f"[{os.path.basename(script_path)} ERROR] {line.strip()}")

        process.wait()
        return process.returncode
    finally:
        os.chdir(original_cwd)  # Move back to original directory

# Run pipelines in parallel with PipelineStatus updates
def run_pipelines_in_parallel(pipeline_paths, price_increase, top_n, status_tracker):
    with ThreadPoolExecutor() as executor:
        futures = []
        for pipeline_path in pipeline_paths:
            futures.append(
                executor.submit(run_script, pipeline_path, [price_increase, "--top-n", top_n])
            )

        for future in as_completed(futures):
            try:
                future.result()
            except Exception as e:
                logging.error(f"Error running pipeline: {e}")

    status_tracker.update_step("pipelines_completed")

# Parse command-line arguments
def parse_args():
    parser = argparse.ArgumentParser(description="Master stock screening pipeline")
    parser.add_argument("price_increase", type=float, help="Minimum price increase percentage")
    parser.add_argument("--top-n", type=int, default=100, help="Number of top stocks to select")
    parser.add_argument("--fetch-data", action="store_true", help="Fetch stock data before running pipelines")
    parser.add_argument("--sleep-after", action="store_true", help="Put computer to sleep after completion")
    return parser.parse_args()

def main():
    setup_logging()
    args = parse_args()

    logging.info("Starting master stock screening pipeline manager.")

    # Initialize PipelineStatus
    status_tracker = PipelineStatus(os.getpid())
    status_tracker.update_step("starting_pipeline")

    if not PIPELINE_PATHS:
        logging.error("No pipelines defined. Exiting.")
        status_tracker.complete_pipeline(failed=True, error_message="No pipelines defined.")
        sys.exit(1)

    # Fetch stock data if requested
    if args.fetch_data:
        logging.info("Fetching stock data...")
        status_tracker.update_step("fetching_stock_data")
        if os.path.exists(fetch_data_script):
            if run_script(fetch_data_script) != 0:
                logging.error("Stock data fetching failed. Exiting.")
                status_tracker.complete_pipeline(failed=True, error_message="Stock data fetching failed.")
                sys.exit(1)
        else:
            logging.error(f"Fetch data script not found: {fetch_data_script}")
            status_tracker.complete_pipeline(failed=True, error_message="Fetch data script not found.")
            sys.exit(1)

    # Run all pipelines in parallel
    logging.info("Running all pipelines in parallel...")
    status_tracker.update_step("running_pipelines")
    run_pipelines_in_parallel(PIPELINE_PATHS, args.price_increase, args.top_n, status_tracker)

    logging.info("All pipelines completed successfully.")

    # Mark pipeline as completed in the status tracker
    status_tracker.complete_pipeline()

    # Sleep if requested
    if args.sleep_after:
        logging.info("Putting computer to sleep in 5 seconds...")
        time.sleep(5)
        put_computer_to_sleep()

if __name__ == "__main__":
    main()
