@echo off
echo 🚀 Force Build from C:\project (Bypassing Directory Check)
echo ================================================================
echo.

echo 📍 Forcing navigation to C:\project...
cd /d "C:\project" 2>nul
if errorlevel 1 (
    echo ❌ Cannot navigate to C:\project - directory may not exist
    pause
    exit /b 1
)

echo ✅ Current directory: %CD%
echo.

echo 📂 Directory contents:
dir /b
echo.

echo 🔍 Looking for project files...
set "PROJECT_VALID=0"

if exist "package.json" set "PROJECT_VALID=1"
if exist "src" set "PROJECT_VALID=1"
if exist "index.html" set "PROJECT_VALID=1"

if "%PROJECT_VALID%"=="0" (
    echo ❌ This doesn't appear to be a valid project directory
    echo 💡 Expected files: package.json, src folder, index.html
    echo.
    echo 🔍 Current contents:
    dir
    echo.
    pause
    exit /b 1
)

echo ✅ Project files detected - proceeding with build...
echo.

echo 📋 Step 1: Installing dependencies...
if not exist "node_modules" (
    echo 📦 Installing npm dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies already installed
)

echo.
echo 📋 Step 2: Building web application...
npm run build
if errorlevel 1 (
    echo ❌ Web build failed
    pause
    exit /b 1
)
echo ✅ Web build completed

echo.
echo 📋 Step 3: Setting up Capacitor...
if not exist "capacitor.config.ts" (
    echo 🔧 Initializing Capacitor...
    npx cap init "Work Schedule" "com.narayya.workschedule"
)

echo.
echo 📋 Step 4: Adding Android platform...
if not exist "android" (
    echo 📱 Adding Android platform...
    npx cap add android
)

echo.
echo 📋 Step 5: Syncing project...
npx cap copy android
npx cap sync android

echo.
echo 📋 Step 6: Opening Android Studio...
npx cap open android

echo.
echo 🎉 Setup completed!
echo 📱 Build your APK in Android Studio:
echo    1. Wait for Gradle sync
echo    2. Build → Build Bundle(s) / APK(s) → Build APK(s)
echo    3. Find APK at: android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause