#!/bin/bash

echo "==================================================="
echo "   GovRecords Desktop - Automatic Setup & Launch"
echo "==================================================="
echo ""

# Check for Node.js
if ! command -v node &> /dev/null
then
    echo "[ERROR] Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check for npm
if ! command -v npm &> /dev/null
then
    echo "[ERROR] npm is not installed!"
    exit 1
fi

# Check if node_modules exists, if not install
if [ ! -d "node_modules" ]; then
    echo "[INFO] First time setup: Installing all requirements..."
    echo "This may take a few minutes depending on your internet speed."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo ""
        echo "[ERROR] Installation failed! Please check your internet connection."
        exit 1
    fi
    echo ""
    echo "[SUCCESS] Requirements installed successfully."
fi

echo "[INFO] Starting application..."
echo ""
npm run electron:dev
