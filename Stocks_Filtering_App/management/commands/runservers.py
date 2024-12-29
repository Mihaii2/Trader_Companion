import subprocess
import sys
from django.core.management.base import BaseCommand
from django.core.management import call_command
import os
import signal
import threading


class Command(BaseCommand):
    help = 'Runs both Django and Flask servers'

    def handle(self, *args, **options):
        # Start Flask in a separate thread
        flask_thread = threading.Thread(target=self.run_flask)
        flask_thread.daemon = True  # This ensures the Flask process is terminated when Django stops
        flask_thread.start()

        # Give Flask a moment to start up
        import time
        time.sleep(2)

        # Start Django
        call_command('runserver')

    def run_flask(self):
        flask_dir = os.path.join(os.getcwd(), 'flask_microservice_stocks_filterer')
        flask_app = os.path.join(flask_dir, 'api_endpoints.py')

        try:
            subprocess.run([sys.executable, flask_app], cwd=flask_dir)
        except KeyboardInterrupt:
            pass