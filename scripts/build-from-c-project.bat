@echo off
echo 🚀 Building APK from C:\project
echo ================================================================
echo.

echo 📍 Navigating to C:\project...
cd /d "C:\project"

if not exist "package.json" (
    echo ❌ Error: package.json not found in C:\project
    echo.
    echo 🔍 Please verify that C:\project contains your React app with:
    echo    - package.json
    echo    - src folder
    echo    - index.html
    echo    - capacitor.config.ts (will be created if missing)
    echo.
    echo 💡 If your project is in a different location, please:
    echo    1. Find the correct folder with package.json
    echo    2. Update this script with the correct path
    echo    3. Or navigate manually: cd "C:\correct\path"
    echo.
    pause
    exit /b 1
)

echo ✅ Found package.json in C:\project
echo 🚀 Starting complete setup and build process...
echo.

REM Call the main setup script
call scripts\complete-setup-windows.bat

echo.
echo 🎉 Build process completed!
echo 📱 Your APK should be at: C:\project\android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause