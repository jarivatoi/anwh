@echo off
echo 🔧 Setting up Android Studio path for Windows...

REM Common Android Studio installation paths on Windows
set "STUDIO_PATH_1=C:\Program Files\Android\Android Studio\bin\studio64.exe"
set "STUDIO_PATH_2=C:\Program Files\Android\Android Studio\bin\studio.exe"
set "STUDIO_PATH_3=%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe"
set "STUDIO_PATH_4=%PROGRAMFILES%\Android\Android Studio\bin\studio64.exe"

echo 🔍 Searching for Android Studio installation...

REM Check each possible path
if exist "%STUDIO_PATH_1%" (
    echo ✅ Found Android Studio at: %STUDIO_PATH_1%
    set "CAPACITOR_ANDROID_STUDIO_PATH=%STUDIO_PATH_1%"
    goto :found
)

if exist "%STUDIO_PATH_2%" (
    echo ✅ Found Android Studio at: %STUDIO_PATH_2%
    set "CAPACITOR_ANDROID_STUDIO_PATH=%STUDIO_PATH_2%"
    goto :found
)

if exist "%STUDIO_PATH_3%" (
    echo ✅ Found Android Studio at: %STUDIO_PATH_3%
    set "CAPACITOR_ANDROID_STUDIO_PATH=%STUDIO_PATH_3%"
    goto :found
)

if exist "%STUDIO_PATH_4%" (
    echo ✅ Found Android Studio at: %STUDIO_PATH_4%
    set "CAPACITOR_ANDROID_STUDIO_PATH=%STUDIO_PATH_4%"
    goto :found
)

echo ❌ Android Studio not found in common locations.
echo Please find your Android Studio installation and set the path manually:
echo.
echo Common locations to check:
echo - C:\Program Files\Android\Android Studio\bin\studio64.exe
echo - C:\Program Files\Android\Android Studio\bin\studio.exe
echo - %LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe
echo.
echo Once found, run this command:
echo set CAPACITOR_ANDROID_STUDIO_PATH="C:\path\to\your\studio64.exe"
echo.
pause
exit /b 1

:found
echo 🎯 Setting environment variable...
setx CAPACITOR_ANDROID_STUDIO_PATH "%CAPACITOR_ANDROID_STUDIO_PATH%"

echo ✅ Environment variable set successfully!
echo 🔄 Please restart your command prompt/terminal for changes to take effect.
echo.
echo After restarting, you can run:
echo npx cap open android
echo.
pause