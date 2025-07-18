@echo off
echo 🔧 Windows Environment Fix for Android Development
echo.

echo This script will help you set up the correct environment variables for Windows.
echo.

REM Set current session variables (temporary)
echo 📝 Setting temporary environment variables for current session...

REM Try to find Android Studio
set "STUDIO_PATH="
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe"
) else if exist "C:\Program Files\Android\Android Studio\bin\studio.exe" (
    set "STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio.exe"
) else if exist "%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe" (
    set "STUDIO_PATH=%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe"
)

if defined STUDIO_PATH (
    echo ✅ Found Android Studio at: %STUDIO_PATH%
    set "CAPACITOR_ANDROID_STUDIO_PATH=%STUDIO_PATH%"
    echo ✅ Set CAPACITOR_ANDROID_STUDIO_PATH for current session
) else (
    echo ❌ Android Studio not found automatically
)

REM Set common Android paths
if exist "C:\Users\%USERNAME%\AppData\Local\Android\Sdk" (
    set "ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
    echo ✅ Set ANDROID_HOME for current session
)

echo.
echo 🚀 Now you can try running your Android build commands in this Command Prompt window.
echo.
echo To make these changes permanent, run these commands:
if defined STUDIO_PATH (
    echo setx CAPACITOR_ANDROID_STUDIO_PATH "%STUDIO_PATH%"
)
if defined ANDROID_HOME (
    echo setx ANDROID_HOME "%ANDROID_HOME%"
)
echo.

echo 🧪 Testing current configuration...
if defined CAPACITOR_ANDROID_STUDIO_PATH (
    echo ✅ CAPACITOR_ANDROID_STUDIO_PATH: %CAPACITOR_ANDROID_STUDIO_PATH%
) else (
    echo ❌ CAPACITOR_ANDROID_STUDIO_PATH: Not set
)

if defined ANDROID_HOME (
    echo ✅ ANDROID_HOME: %ANDROID_HOME%
) else (
    echo ❌ ANDROID_HOME: Not set
)

echo.
echo 🎯 Try running: npx cap open android
echo.
pause