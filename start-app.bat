@echo off
setlocal
title GovRecords Desktop - Startup

echo ===================================================
echo    GovRecords Desktop - Automatic Setup & Launch
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

:: Check if node_modules exists, if not install
if not exist node_modules (
    echo [INFO] First time setup: Installing all requirements...
    echo This may take a few minutes depending on your internet speed.
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo [ERROR] Installation failed! Please check your internet connection.
        pause
        exit /b 1
      )
    echo.
    echo [SUCCESS] Requirements installed successfully.
)

echo [INFO] Starting application...
echo.
npm run electron:dev
pause
