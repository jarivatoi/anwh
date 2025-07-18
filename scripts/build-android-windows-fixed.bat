@echo off
echo 🚀 Starting Android APK build process for Windows (with Android Studio path fix)...

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo ✅ Node.js and npm are installed

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
)

REM Build the web app
echo 🔨 Building web application...
npm run build

if errorlevel 1 (
    echo ❌ Web build failed. Please fix the errors and try again.
    pause
    exit /b 1
)

echo ✅ Web build completed successfully

REM Check if Capacitor is initialized
if not exist "capacitor.config.ts" (
    echo 🔧 Initializing Capacitor...
    npx cap init "Work Schedule" "com.narayya.workschedule"
)

REM Add Android platform if it doesn't exist
if not exist "android" (
    echo 📱 Adding Android platform...
    npx cap add android
)

REM Copy web assets to Android
echo 📋 Copying web assets to Android...
npx cap copy android

REM Sync Capacitor
echo 🔄 Syncing Capacitor...
npx cap sync android

echo ✅ Android project is ready!

REM Try to find and set Android Studio path
echo 🔍 Looking for Android Studio...

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
    echo 📱 Opening Android Studio...
    npx cap open android
) else (
    echo ⚠️ Android Studio not found automatically.
    echo Please open Android Studio manually and import the 'android' folder.
    echo.
    echo To fix this permanently, run: scripts\setup-android-studio-windows.bat
)

echo.
echo 📱 In Android Studio:
echo 1. Wait for Gradle sync to complete
echo 2. Go to Build → Build Bundle^(s^) / APK^(s^) → Build APK^(s^)
echo 3. Find your APK in: android\app\build\outputs\apk\debug\
echo.
echo 🎉 Setup completed!
pause