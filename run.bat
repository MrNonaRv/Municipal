@echo off
cd /d "%~dp0"

:: Initialize environment - Install dependencies if node_modules does not exist
if not exist node_modules (
    call npm install
)

:: Wait 2 seconds for the server to spin up, then open the browser automatically
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Launch the server
call npm run dev
