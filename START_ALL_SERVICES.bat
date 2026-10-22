@echo off
echo ========================================
echo  Blood Donation Platform - Starting All Services
echo ========================================
echo.

REM Check if MongoDB is running
echo [1/4] Checking MongoDB...
tasklist /FI "IMAGENAME eq mongod.exe" 2>NUL | find /I /N "mongod.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo ✓ MongoDB is already running
) else (
    echo ! MongoDB is not running. Starting MongoDB...
    net start MongoDB
)
echo.

REM Start AI Service
echo [2/4] Starting AI Service (Python Flask on port 8000)...
start "AI Service" cmd /k "cd ai-service && python app.py"
timeout /t 3 >nul
echo.

REM Start Backend
echo [3/4] Starting Backend (Node.js on port 5000)...
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 >nul
echo.

REM Start Frontend
echo [4/4] Starting Frontend (React on port 3000)...
start "Frontend" cmd /k "cd frontend && npm start"
echo.

echo ========================================
echo  All services are starting!
echo ========================================
echo.
echo  AI Service:  http://localhost:8000
echo  Backend:     http://localhost:5000
echo  Frontend:    http://localhost:3000
echo.
echo  Three command windows will open:
echo  - AI Service (Python)
echo  - Backend Server (Node.js)
echo  - Frontend (React)
echo.
echo  Keep all windows open while using the app!
echo  Close this window to continue...
echo ========================================
pause
