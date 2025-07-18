@echo off
echo 🧹 Clean Build Script (Fixes Most Issues)
echo ================================================================
echo This script will clean everything and rebuild from scratch
echo.

echo 📍 Navigating to C:\project...
cd /d "C:\project"

echo ✅ Current directory: %CD%
echo.

echo 🧹 Step 1: Cleaning old build files...
if exist "node_modules" (
    echo 🗑️ Removing node_modules...
    rmdir /s /q node_modules
)

if exist "dist" (
    echo 🗑️ Removing dist folder...
    rmdir /s /q dist
)

if exist "android" (
    echo 🗑️ Removing android folder...
    rmdir /s /q android
)

echo ✅ Cleanup completed
echo.

echo 📦 Step 2: Fresh dependency installation...
npm install --no-optional --no-audit --no-fund
if errorlevel 1 (
    echo ❌ npm install failed
    echo 🔧 Trying with legacy peer deps...
    npm install --legacy-peer-deps
    if errorlevel 1 (
        echo ❌ Installation failed completely
        pause
        exit /b 1
    )
)

echo.
echo 🔨 Step 3: Building web application...
npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b 1
)

echo.
echo 📱 Step 4: Setting up Capacitor and Android...
npx cap add android
npx cap copy android
npx cap sync android

echo.
echo 🎯 Step 5: Building APK...
cd android
gradlew.bat assembleDebug

if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo 🎉 SUCCESS! APK built at:
    echo %CD%\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo ⚠️ APK not found, opening Android Studio...
    cd ..
    npx cap open android
)

cd ..
pause