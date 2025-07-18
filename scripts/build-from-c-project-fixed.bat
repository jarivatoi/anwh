@echo off
echo 🚀 Building APK from C:\project
echo ================================================================
echo.

echo 📍 Navigating to C:\project...
if not exist "C:\project" (
    echo ❌ Error: C:\project directory does not exist!
    echo.
    echo 🔍 Please verify the correct path to your project.
    echo Common locations:
    echo    - C:\project
    echo    - C:\Users\%USERNAME%\Desktop\project
    echo    - C:\Users\%USERNAME%\Documents\project
    echo.
    pause
    exit /b 1
)

cd /d "C:\project"
echo ✅ Changed to directory: %CD%

if not exist "package.json" (
    echo ❌ Error: package.json not found in C:\project
    echo.
    echo 🔍 Contents of C:\project:
    dir /b
    echo.
    echo 💡 Your project folder should contain:
    echo    - package.json
    echo    - src folder
    echo    - index.html
    echo    - capacitor.config.ts (will be created if missing)
    echo.
    echo Please verify this is the correct project folder.
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