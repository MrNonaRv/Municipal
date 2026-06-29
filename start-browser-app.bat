@echo off
setlocal
title GovRecords - Web Launcher

echo ===================================================
echo    GovRecords - Start Web App in Browser
echo ===================================================
echo.

:: Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Install dependencies if node_modules doesn't exist
if not exist node_modules (
    echo [INFO] First-time setup: Installing requirements...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Installation failed!
        pause
        exit /b 1
    )
)

echo [INFO] Starting local server...
echo.
echo Please keep this window open while using the application.
echo Once the server is running, open your browser to:
echo http://localhost:3000
echo.

:: Start the browser and run the server
start http://localhost:3000
npm run dev
pause
