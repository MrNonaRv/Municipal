@echo off
cd /d "%~dp0"
echo [LOG] GovRecords Desktop starting... > "%~dp0desktop_log.txt"

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH. >> "%~dp0desktop_log.txt"
    echo msgbox "Node.js is not installed! Please install Node.js from https://nodejs.org/ to run this app.", 16, "Error" > "%temp%\alert.vbs"
    wscript "%temp%\alert.vbs"
    del "%temp%\alert.vbs"
    exit /b 1
)

:: Check if npm is installed
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in PATH. >> "%~dp0desktop_log.txt"
    echo msgbox "npm is not installed! Please install Node.js to get npm.", 16, "Error" > "%temp%\alert.vbs"
    wscript "%temp%\alert.vbs"
    del "%temp%\alert.vbs"
    exit /b 1
)

:: Initialize environment - Install dependencies if node_modules does not exist
if not exist node_modules (
    echo [LOG] node_modules not found. Installing dependencies... >> "%~dp0desktop_log.txt"
    call npm install >> "%~dp0desktop_log.txt" 2>&1
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. >> "%~dp0desktop_log.txt"
        echo msgbox "Failed to install dependencies! Check desktop_log.txt for details.", 16, "Error" > "%temp%\alert.vbs"
        wscript "%temp%\alert.vbs"
        del "%temp%\alert.vbs"
        exit /b 1
    )
)

echo [LOG] Starting server... >> "%~dp0desktop_log.txt"

:: Create a temporary script to wait for server and launch browser safely without escaping issues
echo const http = require('http'); > "%temp%\launch_browser.js"
echo const { exec } = require('child_process'); >> "%temp%\launch_browser.js"
echo const url = 'http://localhost:3000'; >> "%temp%\launch_browser.js"
echo function check() { >> "%temp%\launch_browser.js"
echo   http.get(url, (res) => { >> "%temp%\launch_browser.js"
echo     exec('start ' + url); >> "%temp%\launch_browser.js"
echo   }).on('error', () => { >> "%temp%\launch_browser.js"
echo     setTimeout(check, 500); >> "%temp%\launch_browser.js"
echo   }); >> "%temp%\launch_browser.js"
echo } >> "%temp%\launch_browser.js"
echo setTimeout(check, 500); >> "%temp%\launch_browser.js"

start "" /b node "%temp%\launch_browser.js"

:: Launch the server and redirect all logs
call npm run dev >> "%~dp0desktop_log.txt" 2>&1
