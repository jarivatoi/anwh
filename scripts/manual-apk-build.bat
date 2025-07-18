@echo off
echo 🔧 Manual APK Build Guide
echo ================================================================
echo This script will guide you through manual APK building
echo.

echo 📍 Current directory: %CD%
echo.

echo 📋 Step 1: Verify project setup...
if not exist "package.json" (
    echo ❌ Not in project directory!
    echo Navigate to your project folder first
    pause
    exit /b 1
)

if not exist "android" (
    echo ❌ Android platform not added yet
    echo 🔧 Adding Android platform...
    npx cap add android
)

echo ✅ Project setup verified
echo.

echo 📋 Step 2: Build web app...
npm run build
if errorlevel 1 (
    echo ❌ Web build failed - fix errors first
    pause
    exit /b 1
)

echo.
echo 📋 Step 3: Copy to Android...
npx cap copy android
npx cap sync android

echo.
echo 📋 Step 4: Manual APK build options...
echo.
echo Choose your build method:
echo 1. Try Gradle command line (automated)
echo 2. Open Android Studio (manual)
echo 3. Exit
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" goto gradle_build
if "%choice%"=="2" goto android_studio
if "%choice%"=="3" goto end

:gradle_build
echo.
echo 🔨 Building with Gradle...
cd android
gradlew.bat assembleDebug --info
if exist "app\build\outputs\apk\debug\app-debug.apk" (
    echo 🎉 APK built successfully!
    echo Location: %CD%\app\build\outputs\apk\debug\app-debug.apk
) else (
    echo ❌ Gradle build failed
    echo 🔧 Falling back to Android Studio...
    goto android_studio
)
cd ..
goto end

:android_studio
echo.
echo 📱 Opening Android Studio...
echo.
echo 📋 Manual steps in Android Studio:
echo 1. Wait for project to load and Gradle sync to complete
echo 2. If you see errors, try: File → Invalidate Caches and Restart
echo 3. Go to: Build → Build Bundle(s) / APK(s) → Build APK(s)
echo 4. Wait for build to complete
echo 5. Click "locate" when build finishes
echo.
echo 📁 APK will be at: android\app\build\outputs\apk\debug\app-debug.apk
echo.
npx cap open android

:end
echo.
echo 🎯 Build process completed!
pause