#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

# Step into the exact directory containing your manage.py
cd LoaftBackend/LoaftApi

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Running Database Migrations..."
python manage.py migrate --noinput

echo "Initializing Admin Credentials..."
python manage.py initadmin
