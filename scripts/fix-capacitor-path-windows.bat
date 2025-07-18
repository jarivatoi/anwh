@echo off
echo 🔧 Fixing Capacitor Android Studio Path for Windows
echo.

echo 🔍 Detecting your environment...
echo You're running Windows but using a Unix-like shell (Git Bash/WSL)
echo.

REM Find Android Studio
set "STUDIO_PATH="
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe"
    echo ✅ Found Android Studio at: %STUDIO_PATH%
) else if exist "C:\Program Files\Android\Android Studio\bin\studio.exe" (
    set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio.exe"
    echo ✅ Found Android Studio at: %STUDIO_PATH%
) else if exist "%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe" (
    set "STUDIO_PATH=%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe"
    echo ✅ Found Android Studio at: %STUDIO_PATH%
) else (
    echo ❌ Android Studio not found in common Windows locations
    echo Please install Android Studio from: https://developer.android.com/studio
    pause
    exit /b 1
)

echo.
echo 🎯 Setting Windows environment variables...

REM Set the environment variable permanently
setx CAPACITOR_ANDROID_STUDIO_PATH "%STUDIO_PATH%"
if errorlevel 1 (
    echo ❌ Failed to set environment variable
) else (
    echo ✅ Successfully set CAPACITOR_ANDROID_STUDIO_PATH
)

REM Also set Android SDK path if it exists
if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk" (
    setx ANDROID_HOME "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
    echo ✅ Set ANDROID_HOME to: C:\Users\%USERNAME%\AppData\Local\Android\Sdk
)

echo.
echo 🔄 IMPORTANT: You need to restart your terminal/shell for changes to take effect!
echo.
echo After restarting:
echo 1. Close this Command Prompt
echo 2. Close your Git Bash/WSL terminal
echo 3. Open a new Command Prompt (cmd)
echo 4. Run: npx cap open android
echo.
echo 📝 Environment variables set:
echo CAPACITOR_ANDROID_STUDIO_PATH=%STUDIO_PATH%
if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk" (
    echo ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
)
echo.
pause