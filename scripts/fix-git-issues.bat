@echo off
echo 🔧 Fix Git Issues and Build APK
echo ================================================================
echo This script fixes git-related crashes and builds your APK
echo.

echo 📍 Step 1: Disable git operations...
set GIT_OPTIONAL=1
set NO_GIT=1

echo 📍 Step 2: Navigate to project...
cd /d "C:\project"

echo 📍 Step 3: Check environment...
echo Current directory: %CD%
if not exist "package.json" (
    echo ❌ package.json not found
    pause
    exit /b 1
)

echo.
echo 📋 Step 4: Install dependencies (git-safe)...
npm config set fund false
npm config set audit false
npm install --no-optional
if errorlevel 1 (
    echo ❌ npm install failed
    pause
    exit /b 1
)

echo.
echo 📋 Step 5: Build web app...
npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo 📋 Step 6: Setup Android (no git)...
if not exist "android" (
    npx cap add android
)
npx cap copy android
npx cap sync android

echo.
echo 📋 Step 7: Build APK...
cd android

echo 🔨 Building APK with Gradle...
gradlew.bat clean assembleDebug

if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo.
    echo 🎉 SUCCESS! APK built successfully!
    echo.
    echo 📱 APK Location:
    echo %CD%\app\build\outputs\apk\debug\app-debug.apk
    echo.
    for %%A in ("app\build\outputs\apk\debug\app-debug.apk") do (
        echo 📊 File Size: %%~zA bytes
    )
    echo.
    echo 🎯 Ready to install on Android device!
) else (
    echo ❌ APK build failed
    echo 🔧 Opening Android Studio for manual build...
    cd ..
    npx cap open android
    echo.
    echo 📋 In Android Studio:
    echo 1. Wait for Gradle sync
    echo 2. Build → Build Bundle(s) / APK(s) → Build APK(s)
)

cd ..
echo.
pause