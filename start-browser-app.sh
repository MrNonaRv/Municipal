#!/bin/bash

echo "==================================================="
echo "   GovRecords - Start Web App in Browser"
echo "==================================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if node_modules exists, if not install
if [ ! -d "node_modules" ]; then
    echo "[INFO] First-time setup: Installing requirements..."
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Installation failed!"
        exit 1
    fi
fi

echo "[INFO] Starting local server..."
echo "Open your browser to: http://localhost:3000"
echo ""

# Try to open the URL automatically
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:3000
elif command -v open &> /dev/null; then
    open http://localhost:3000
fi

npm run dev
