@echo off
title GovRecords Desktop
echo Starting GovRecords Desktop...
echo Initializing environment (this might take a moment on first run)...

call npm install
if %ERRORLEVEL% neq 0 (
    echo Failed to install dependencies.
    pause
    exit /b %ERRORLEVEL%
)

call npm run build
if %ERRORLEVEL% neq 0 (
    echo Failed to build the application.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo GovRecords Desktop is starting...
echo A browser window should open automatically.
echo Keep this window open while using the app!
echo ===================================================
echo.

call npm start
pause
