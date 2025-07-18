@echo off
echo 🚀 Git-Free APK Build Script for C:\project
echo ================================================================
echo This script avoids ALL git operations to prevent crashes
echo.

echo 📍 Step 1: Navigating to C:\project...
cd /d "C:\project"

if not exist "package.json" (
    echo ❌ Error: package.json not found in C:\project
    echo Please verify you're in the correct directory
    pause
    exit /b 1
)

echo ✅ Found package.json in C:\project
echo.

echo 📋 Step 2: Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is NOT installed
    echo 📥 Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js is installed
    node --version
)

echo.
echo 📋 Step 3: Installing dependencies (without git)...
echo 📦 Installing npm dependencies...
npm install --no-optional --no-audit --no-fund
if errorlevel 1 (
    echo ❌ Failed to install dependencies
    echo 🔧 Trying alternative installation...
    npm install --legacy-peer-deps --no-optional
    if errorlevel 1 (
        echo ❌ Alternative installation also failed
        pause
        exit /b 1
    )
)
echo ✅ Dependencies installed successfully

echo.
echo 📋 Step 4: Building web application...
echo 🔨 Running npm run build...
npm run build
if errorlevel 1 (
    echo ❌ Web build failed
    echo 🔧 Checking for build issues...
    echo.
    echo 💡 Common fixes:
    echo 1. Delete node_modules and try again
    echo 2. Check for TypeScript errors
    echo 3. Ensure all imports are correct
    pause
    exit /b 1
)
echo ✅ Web build completed successfully

echo.
echo 📋 Step 5: Capacitor setup (git-free)...
if not exist "capacitor.config.ts" (
    echo 🔧 Initializing Capacitor...
    npx cap init "Work Schedule" "com.narayya.workschedule" --no-git
    if errorlevel 1 (
        echo ❌ Capacitor initialization failed
        pause
        exit /b 1
    )
) else (
    echo ✅ Capacitor already configured
)

echo.
echo 📋 Step 6: Adding Android platform (git-free)...
if not exist "android" (
    echo 📱 Adding Android platform...
    npx cap add android --no-git
    if errorlevel 1 (
        echo ❌ Failed to add Android platform
        echo 🔧 Trying without git flag...
        npx cap add android
        if errorlevel 1 (
            echo ❌ Android platform addition failed completely
            pause
            exit /b 1
        )
    )
) else (
    echo ✅ Android platform already exists
)

echo.
echo 📋 Step 7: Copying assets and syncing...
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

echo ✅ All Capacitor setup completed!
echo.

echo 📋 Step 8: Building APK directly with Gradle...
echo 🔍 Attempting direct APK build...

cd android
if exist "gradlew.bat" (
    echo 📱 Building debug APK with Gradle...
    echo This may take several minutes on first build...
    
    REM Clean first to ensure fresh build
    gradlew.bat clean
    
    REM Build the APK
    gradlew.bat assembleDebug --no-daemon --offline
    
    if errorlevel 1 (
        echo ⚠️ Offline build failed, trying with network...
        gradlew.bat assembleDebug --no-daemon
        
        if errorlevel 1 (
            echo ❌ Gradle build failed
            echo 🔧 Opening Android Studio for manual build...
            cd ..
            npx cap open android
            echo.
            echo 📱 In Android Studio:
            echo 1. Wait for Gradle sync to complete (may take 10+ minutes first time)
            echo 2. Go to Build → Build Bundle(s) / APK(s) → Build APK(s)
            echo 3. Find your APK in: android\app\build\outputs\apk\debug\
            goto :end
        )
    )
    
    echo 🎉 APK built successfully!
    echo.
    
    if exist "app\build\outputs\apk\debug\app-debug.apk" (
        echo ✅ APK Location: %CD%\app\build\outputs\apk\debug\app-debug.apk
        
        for %%A in ("app\build\outputs\apk\debug\app-debug.apk") do (
            set /a size=%%~zA/1024/1024
            echo 📊 APK Size: !size! MB
        )
        
        echo.
        echo 🎯 Your APK is ready to install!
        echo 📱 To install on Android device:
        echo 1. Enable "Unknown Sources" in Android settings
        echo 2. Transfer APK to device
        echo 3. Open APK file to install
        
    ) else (
        echo ⚠️ APK file not found in expected location
        echo 🔍 Searching for APK files...
        dir /s *.apk
    )
    
) else (
    echo ❌ Gradle wrapper not found
    echo 🔧 Opening Android Studio for setup...
    cd ..
    npx cap open android
)

:end
cd ..

echo.
echo 🎉 Build process completed!
echo.
pause