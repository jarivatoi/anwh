@echo off
echo 🚀 Quick Fix for Android Studio Path Issue
echo.

echo This will fix the "Unable to launch Android Studio" error
echo.

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ Please run this script from your project root directory
    pause
    exit /b 1
)

echo 🔍 Searching for Android Studio...

REM Find Android Studio
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe"
    goto :found
)

if exist "C:\Program Files\Android\Android Studio\bin\studio.exe" (
    set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio.exe"
    goto :found
)

if exist "%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe" (
    set "STUDIO_PATH=%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe"
    goto :found
)

echo ❌ Android Studio not found. Please install it from:
echo https://developer.android.com/studio
pause
exit /b 1

:found
echo ✅ Found Android Studio at: %STUDIO_PATH%

echo 🔧 Setting environment variable...
setx CAPACITOR_ANDROID_STUDIO_PATH "%STUDIO_PATH%"

echo ✅ Environment variable set!
echo.
echo 🔄 RESTART your terminal and try again:
echo 1. Close this window
echo 2. Open a new Command Prompt
echo 3. Navigate to your project folder
echo 4. Run: npx cap open android
echo.
pause