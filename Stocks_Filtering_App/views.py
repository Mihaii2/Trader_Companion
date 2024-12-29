from django.shortcuts import render

# Create your views here.
import requests
from django.shortcuts import render
from django.http import HttpResponse

def hello_view(request):
    try:
        # Make request to Flask microservice
        response = requests.get('http://localhost:5000/hello')
        data = response.json()
        return HttpResponse(data['message'])
    except requests.RequestException as e:
        return HttpResponse(f"Error: Could not connect to Flask service. {str(e)}")
