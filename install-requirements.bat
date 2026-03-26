@echo off
setlocal
title GovRecords Desktop - Installer

echo ===================================================
echo    GovRecords Desktop - Requirements Installer
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

echo [INFO] Installing all application requirements...
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
echo [SUCCESS] All requirements installed successfully!
echo You can now run the application using start-app.bat
echo.
pause
