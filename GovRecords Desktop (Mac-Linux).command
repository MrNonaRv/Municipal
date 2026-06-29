#!/bin/bash
cd "$(dirname "$0")"

echo "Starting GovRecords Desktop..."
echo "Initializing environment (this might take a moment on first run)..."

npm install
if [ $? -ne 0 ]; then
    echo "Failed to install dependencies."
    read -p "Press any key to exit..."
    exit 1
fi

npm run build
if [ $? -ne 0 ]; then
    echo "Failed to build the application."
    read -p "Press any key to exit..."
    exit 1
fi

echo ""
echo "==================================================="
echo "GovRecords Desktop is starting..."
echo "A browser window should open automatically."
echo "Keep this terminal open while using the app!"
echo "==================================================="
echo ""

npm start
