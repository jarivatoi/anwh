@echo off
echo 🔄 Switching to Command Prompt for proper execution...
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Error: Not in project directory!
    echo.
    echo 🔍 Please navigate to your project folder first.
    echo Your project folder should contain:
    echo - package.json
    echo - src folder  
    echo - index.html
    echo.
    echo Then run this command in Command Prompt (not PowerShell):
    echo scripts\complete-setup-windows.bat
    echo.
    pause
    exit /b 1
)

echo ✅ Found package.json - in correct project directory
echo 🚀 Starting complete setup and build process...
echo.

call scripts\complete-setup-windows.bat