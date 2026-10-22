@echo off
echo ========================================
echo  Blood Donation Platform - Stopping All Services
echo ========================================
echo.

echo Stopping all Node.js processes...
taskkill /F /IM node.exe 2>nul

echo Stopping all Python processes...
taskkill /F /IM python.exe 2>nul

echo.
echo ========================================
echo  All services stopped!
echo ========================================
pause
