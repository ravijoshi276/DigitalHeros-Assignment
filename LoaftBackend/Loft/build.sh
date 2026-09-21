#!/bin/bash
echo "Installing dependencies..."
pip install -r requirements.txt

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Running Database Migrations..."
python manage.py migrate --noinput

echo "Initializing Admin Credentials..."
python manage.py initadmin
