# Stock Filtering Application

A Django-based web application with a Flask microservice for filtering and analyzing stocks.

## Project Structure

```
├── djangoProject/            # Main Django project
├── stock_filtering_app/      # Django app for stock filtering
├── flask_microservice_stocks_filterer/  # Flask microservice
└── docker-compose.yml        # Docker compose configuration
```

## Prerequisites

- Docker
- Docker Compose

## Running the Application

1. Clone the repository:
```bash
git clone <your-repository-url>
cd djangoProject
```

2. Build and start the Docker containers:
```bash
docker-compose up --build
```

This will:
- Build the Django application container
- Build the Flask microservice container
- Start both services
- The Django app will be available at http://localhost:8000

3. To run in detached mode (background):
```bash
docker-compose up -d
```

4. To stop the application:
```bash
docker-compose down
```

## Development Notes

- Changes made to the Django code will automatically reflect in the running application due to volume mounting
- The Flask microservice is accessible from the Django app via the service name 'microservice'
- When running locally (without Docker), the Flask service should be running on localhost:5000

## API Endpoints

### Django Application
- `GET /stock_filtering_app/pipeline/status` - Get the current pipeline status
- `GET /stock_filtering_app/rankings/stocks_ranking_by_price` - Get stock rankings by price
- Additional endpoints...

### Flask Microservice
- `GET /pipeline/status` - Get pipeline processing status
- Additional endpoints...

## Troubleshooting

1. If you get connection errors from Django to the Flask service:
   - When running in Docker: Make sure you're using `http://microservice:5000` as the service URL
   - When running locally: Use `http://localhost:5000`

2. Database migrations:
```bash
docker-compose exec web python manage.py migrate
```

3. To access container shells:
```bash
# Django container
docker-compose exec web bash

# Flask container
docker-compose exec microservice bash
```

## Additional Commands

- View logs:
```bash
# All services
docker-compose logs

# Specific service
docker-compose logs web
docker-compose logs microservice
```

- Rebuild specific service:
```bash
docker-compose build web
docker-compose build microservice
```

- Restart specific service:
```bash
docker-compose restart web
docker-compose restart microservice
```

## Environment Variables

The application uses the following environment variables:
- `FLASK_SERVICE_URL`: URL for the Flask microservice
  - In Docker: `http://microservice:5000`
  - Local development: `http://localhost:5000`
- `DEBUG`: Debug mode (1 or 0)
- `DJANGO_ALLOWED_HOSTS`: Allowed hosts for Django

## Contributing

1. Create a new branch for your feature
2. Make your changes
3. Submit a pull request