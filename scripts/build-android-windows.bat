@echo off
echo 🚀 Starting Android APK build process for Windows...

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
echo.
echo 📱 Opening Android Studio...
echo If Android Studio doesn't open automatically, manually open the 'android' folder in Android Studio
echo.

REM Try to open Android Studio
npx cap open android

if errorlevel 1 (
    echo ⚠️ Could not open Android Studio automatically
    echo Please manually open Android Studio and import the 'android' folder
)

echo.
echo 📱 In Android Studio:
echo 1. Wait for Gradle sync to complete
echo 2. Go to Build → Build Bundle^(s^) / APK^(s^) → Build APK^(s^)
echo 3. Find your APK in: android\app\build\outputs\apk\debug\
echo.
echo 🎉 Setup completed!
pause