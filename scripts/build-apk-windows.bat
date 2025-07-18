@echo off
echo 🚀 Building APK for Windows - Work Schedule App
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo ❌ Java is not installed. Please install JDK 11 or higher.
    echo Download from: https://adoptium.net/temurin/releases/
    pause
    exit /b 1
)

echo ✅ Node.js and Java are installed

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
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
    if errorlevel 1 (
        echo ❌ Failed to add Android platform
        pause
        exit /b 1
    )
)

REM Copy web assets to Android
echo 📋 Copying web assets to Android...
npx cap copy android
if errorlevel 1 (
    echo ❌ Failed to copy assets
    pause
    exit /b 1
)

REM Sync Capacitor
echo 🔄 Syncing Capacitor...
npx cap sync android
if errorlevel 1 (
    echo ❌ Failed to sync Capacitor
    pause
    exit /b 1
)

echo ✅ Android project is ready!
echo.

REM Check if we can build directly with Gradle
echo 🔍 Checking if we can build APK directly...
cd android

REM Make gradlew executable (not needed on Windows, but good practice)
if exist "gradlew.bat" (
    echo 📱 Building APK with Gradle...
    gradlew.bat assembleDebug
    if errorlevel 1 (
        echo ⚠️ Direct APK build failed. Opening Android Studio instead...
        cd ..
        echo 📱 Opening Android Studio...
        npx cap open android
    ) else (
        echo 🎉 APK built successfully!
        echo 📱 APK location: android\app\build\outputs\apk\debug\app-debug.apk
        
        REM Check if APK exists and show size
        if exist "app\build\outputs\apk\debug\app-debug.apk" (
            for %%A in ("app\build\outputs\apk\debug\app-debug.apk") do (
                echo 📊 APK Size: %%~zA bytes
            )
            echo.
            echo ✅ Your APK is ready to install on Android devices!
            echo 📁 Location: %CD%\app\build\outputs\apk\debug\app-debug.apk
        )
    )
) else (
    echo ❌ Gradle wrapper not found
    cd ..
    echo 📱 Opening Android Studio...
    npx cap open android
)

cd ..

echo.
echo 📱 Next steps:
echo 1. If APK was built successfully, you can install it on your Android device
echo 2. If Android Studio opened, build the APK manually:
echo    - Wait for Gradle sync to complete
echo    - Go to Build → Build Bundle(s) / APK(s) → Build APK(s)
echo    - Find your APK in: android\app\build\outputs\apk\debug\
echo.
echo 🎉 Setup completed!
pause