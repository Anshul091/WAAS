#!/bin/bash

# Stop the server if it's already running
echo "Stopping server..."
# Add command to stop the server here
pkill -f "python3 waas/manage.py runserver"
pkill -f "node bots/index.js"

# Pull the latest changes from the repository
echo "Pulling latest changes..."
# Add command to pull changes from the repository here
git pull

# Install dependencies
echo "Installing dependencies..."
# Add command to install dependencies here
source ./v1/bin/activate
pip install -r requirements.txt
cd bots
npm install
cd ..

# Build the server
echo "Building server..."
# Add command to build the server here


# Start the server
echo "Starting server..."
# Add command to start the server here
# Run python server in the background
python3 waas/manage.py runserver 0.0.0.0:8000 &
node bots/bot.js &

echo "Server deployed successfully!"
