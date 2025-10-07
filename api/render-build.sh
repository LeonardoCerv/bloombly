#!/bin/bash
# Render.com deployment setup script

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Starting the application..."
cd app && python main.py