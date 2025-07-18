@echo off
echo 🔧 Setting Android Studio path for Windows...

REM Search for Android Studio
echo 🔍 Searching for Android Studio installation...

set "FOUND_PATH="

REM Check common paths
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    echo ✅ Found Android Studio at: C:\Program Files\Android\Android Studio\bin\studio64.exe
    set "FOUND_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe"
    goto :found
)

if exist "C:\Program Files\Android\Android Studio\bin\studio.exe" (
    echo ✅ Found Android Studio at: C:\Program Files\Android\Android Studio\bin\studio.exe
    set "FOUND_PATH=C:\Program Files\Android\Android Studio\bin\studio.exe"
    goto :found
)

if exist "%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe" (
    echo ✅ Found Android Studio at: %LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe
    set "FOUND_PATH=%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe"
    goto :found
)

if exist "%PROGRAMFILES%\Android\Android Studio\bin\studio64.exe" (
    echo ✅ Found Android Studio at: %PROGRAMFILES%\Android\Android Studio\bin\studio64.exe
    set "FOUND_PATH=%PROGRAMFILES%\Android\Android Studio\bin\studio64.exe"
    goto :found
)

echo ❌ Android Studio not found in common locations.
echo Please find your Android Studio installation and run:
echo setx CAPACITOR_ANDROID_STUDIO_PATH "C:\path\to\your\studio64.exe"
echo.
echo Common locations to check:
echo - C:\Program Files\Android\Android Studio\bin\studio64.exe
echo - C:\Program Files\Android\Android Studio\bin\studio.exe
echo - %LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe
echo.
pause
exit /b 1

:found
echo 🎯 Setting environment variable...
setx CAPACITOR_ANDROID_STUDIO_PATH "%FOUND_PATH%"

if errorlevel 1 (
    echo ❌ Failed to set environment variable
    echo Please run this command manually:
    echo setx CAPACITOR_ANDROID_STUDIO_PATH "%FOUND_PATH%"
) else (
    echo ✅ Environment variable set successfully!
    echo 🔄 Please restart Command Prompt for changes to take effect.
    echo.
    echo After restarting, you can run:
    echo npx cap open android
)

echo.
pause