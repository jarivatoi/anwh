@echo off
echo 🚀 Complete Windows APK Setup and Build Script
echo ================================================================
echo.

echo 📍 Step 1: Checking current directory...
if not exist "package.json" (
    echo ❌ Error: Not in project directory!
    echo.
    echo 🔍 Please navigate to your project folder first:
    echo    1. Open Command Prompt
    echo    2. Use 'cd' command to navigate to your project folder
    echo    3. Example: cd C:\Users\YourName\Desktop\your-project-folder
    echo    4. Then run this script again
    echo.
    echo 💡 Your project folder should contain:
    echo    - package.json
    echo    - src folder
    echo    - index.html
    echo    - capacitor.config.ts (will be created if missing)
    echo.
    pause
    exit /b 1
)

echo ✅ Found package.json - in correct project directory
echo.

echo 📋 Step 2: Checking required software...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is NOT installed
    echo 📥 Please install Node.js from: https://nodejs.org/
    echo    Then restart this script
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
    node --version
)

REM Check Java
java -version >nul 2>&1
if errorlevel 1 (
    echo ❌ Java is NOT installed
    echo 📥 Please install JDK 11+ from: https://adoptium.net/temurin/releases/
    echo    Then restart this script
    pause
    exit /b 1
) else (
    echo ✅ Java is installed
    java -version 2>&1 | findstr "version"
)

echo.
echo 📋 Step 3: Checking environment variables...

set "MISSING_VARS="

if "%JAVA_HOME%"=="" (
    echo ❌ JAVA_HOME is not set
    set "MISSING_VARS=1"
) else (
    echo ✅ JAVA_HOME: %JAVA_HOME%
)

if "%ANDROID_HOME%"=="" (
    echo ❌ ANDROID_HOME is not set
    set "MISSING_VARS=1"
) else (
    echo ✅ ANDROID_HOME: %ANDROID_HOME%
)

if "%CAPACITOR_ANDROID_STUDIO_PATH%"=="" (
    echo ❌ CAPACITOR_ANDROID_STUDIO_PATH is not set
    set "MISSING_VARS=1"
) else (
    echo ✅ CAPACITOR_ANDROID_STUDIO_PATH: %CAPACITOR_ANDROID_STUDIO_PATH%
)

if defined MISSING_VARS (
    echo.
    echo ⚠️ Missing environment variables detected!
    echo.
    echo 🔧 To fix this:
    echo 1. Press Win + R, type 'sysdm.cpl', press Enter
    echo 2. Click 'Environment Variables'
    echo 3. Under 'System Variables', click 'New' for each missing variable:
    echo.
    if "%JAVA_HOME%"=="" (
        echo    JAVA_HOME = C:\Program Files\Eclipse Adoptium\jdk-11.0.19.7-hotspot
    )
    if "%ANDROID_HOME%"=="" (
        echo    ANDROID_HOME = C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    )
    if "%CAPACITOR_ANDROID_STUDIO_PATH%"=="" (
        echo    CAPACITOR_ANDROID_STUDIO_PATH = C:\Program Files\Android\Android Studio\bin\studio64.exe
    )
    echo.
    echo 4. Restart your computer
    echo 5. Run this script again
    echo.
    pause
    exit /b 1
)

echo.
echo 📋 Step 4: Installing dependencies...
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
echo 📋 Step 5: Building web application...
echo 🔨 Running npm run build...
npm run build
if errorlevel 1 (
    echo ❌ Web build failed
    pause
    exit /b 1
)
echo ✅ Web build completed

echo.
echo 📋 Step 6: Setting up Capacitor...
if not exist "capacitor.config.ts" (
    echo 🔧 Initializing Capacitor...
    npx cap init "Work Schedule" "com.narayya.workschedule"
    if errorlevel 1 (
        echo ❌ Capacitor initialization failed
        pause
        exit /b 1
    )
) else (
    echo ✅ Capacitor already configured
)

echo.
echo 📋 Step 7: Adding Android platform...
if not exist "android" (
    echo 📱 Adding Android platform...
    npx cap add android
    if errorlevel 1 (
        echo ❌ Failed to add Android platform
        pause
        exit /b 1
    )
) else (
    echo ✅ Android platform already added
)

echo.
echo 📋 Step 8: Copying assets and syncing...
echo 📋 Copying web assets to Android...
npx cap copy android
if errorlevel 1 (
    echo ❌ Failed to copy assets
    pause
    exit /b 1
)

echo 🔄 Syncing Capacitor...
npx cap sync android
if errorlevel 1 (
    echo ❌ Failed to sync Capacitor
    pause
    exit /b 1
)

echo ✅ All setup completed successfully!
echo.

echo 📋 Step 9: Building APK...
echo 🔍 Checking if we can build directly with Gradle...

cd android
if exist "gradlew.bat" (
    echo 📱 Attempting to build APK directly...
    gradlew.bat assembleDebug
    if errorlevel 1 (
        echo ⚠️ Direct build failed. Opening Android Studio instead...
        cd ..
        echo 📱 Opening Android Studio...
        npx cap open android
        echo.
        echo 📱 In Android Studio:
        echo 1. Wait for Gradle sync to complete
        echo 2. Go to Build → Build Bundle^(s^) / APK^(s^) → Build APK^(s^)
        echo 3. Find your APK in: android\app\build\outputs\apk\debug\
    ) else (
        echo 🎉 APK built successfully!
        echo 📱 APK location: android\app\build\outputs\apk\debug\app-debug.apk
        
        if exist "app\build\outputs\apk\debug\app-debug.apk" (
            for %%A in ("app\build\outputs\apk\debug\app-debug.apk") do (
                echo 📊 APK Size: %%~zA bytes
            )
            echo.
            echo ✅ Your APK is ready to install on Android devices!
            echo 📁 Full path: %CD%\app\build\outputs\apk\debug\app-debug.apk
        )
    )
) else (
    echo ❌ Gradle wrapper not found
    cd ..
    echo 📱 Opening Android Studio for manual build...
    npx cap open android
)

cd ..

echo.
echo 🎉 Setup and build process completed!
echo.
echo 📱 Next steps:
echo 1. If APK was built successfully, you can install it on your Android device
echo 2. If Android Studio opened, build the APK manually as instructed above
echo 3. To install APK: Enable "Unknown Sources" on your Android device and install the APK file
echo.
pause