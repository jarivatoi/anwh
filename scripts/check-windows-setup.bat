@echo off
echo 🔍 Checking Windows Environment for Android Development
echo ================================================================
echo.

echo 📋 Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is NOT installed
    echo 📥 Download from: https://nodejs.org/
) else (
    echo ✅ Node.js is installed
    node --version
)
echo.

echo 📋 Checking Java...
java -version >nul 2>&1
if errorlevel 1 (
    echo ❌ Java is NOT installed
    echo 📥 Download JDK 11+ from: https://adoptium.net/temurin/releases/
) else (
    echo ✅ Java is installed
    java -version 2>&1 | findstr "version"
)
echo.

echo 📋 Checking Environment Variables...
if "%JAVA_HOME%"=="" (
    echo ❌ JAVA_HOME is not set
    echo 🔧 Set to your JDK installation path
) else (
    echo ✅ JAVA_HOME: %JAVA_HOME%
)

if "%ANDROID_HOME%"=="" (
    echo ❌ ANDROID_HOME is not set
    echo 🔧 Set to your Android SDK path
) else (
    echo ✅ ANDROID_HOME: %ANDROID_HOME%
)

if "%CAPACITOR_ANDROID_STUDIO_PATH%"=="" (
    echo ❌ CAPACITOR_ANDROID_STUDIO_PATH is not set
    echo 🔧 Set to your Android Studio executable path
) else (
    echo ✅ CAPACITOR_ANDROID_STUDIO_PATH: %CAPACITOR_ANDROID_STUDIO_PATH%
)
echo.

echo 📋 Checking Android Studio Installation...
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    echo ✅ Android Studio found at: C:\Program Files\Android\Android Studio\bin\studio64.exe
) else if exist "C:\Program Files\Android\Android Studio\bin\studio.exe" (
    echo ✅ Android Studio found at: C:\Program Files\Android\Android Studio\bin\studio.exe
) else (
    echo ❌ Android Studio not found in default location
    echo 📥 Download from: https://developer.android.com/studio
)
echo.

echo 📋 Checking Project Status...
if exist "package.json" (
    echo ✅ Project package.json found
) else (
    echo ❌ Not in project directory or package.json missing
)

if exist "capacitor.config.ts" (
    echo ✅ Capacitor is configured
) else (
    echo ⚠️ Capacitor not initialized yet
)

if exist "android" (
    echo ✅ Android platform added
) else (
    echo ⚠️ Android platform not added yet
)
echo.

echo 🎯 Next Steps:
echo 1. Install any missing software listed above
echo 2. Set missing environment variables
echo 3. Restart your computer
echo 4. Run: scripts\build-apk-windows.bat
echo.
pause