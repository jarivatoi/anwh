@echo off
echo 🚀 Create Android Platform and Build APK
echo ================================================================
echo This script will create the android folder and build your APK
echo.

echo 📍 Step 1: Verify we're in the right place...
if not exist "package.json" (
    echo ❌ Error: package.json not found!
    echo.
    echo 🔍 Current directory: %CD%
    echo 📂 Contents:
    dir /b
    echo.
    echo Please navigate to your project folder first.
    pause
    exit /b 1
)

echo ✅ Found package.json - we're in the right directory
echo 📁 Current directory: %CD%
echo.

echo 📋 Step 2: Check Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found
    echo 📥 Install from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo ✅ Node.js found: 
    node --version
)

echo.
echo 📋 Step 3: Install dependencies...
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ❌ npm install failed
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies already installed
)

echo.
echo 📋 Step 4: Build web application...
echo 🔨 Building React app...
npm run build
if errorlevel 1 (
    echo ❌ Build failed
    echo 🔧 Check for TypeScript or build errors above
    pause
    exit /b 1
)
echo ✅ Web app built successfully

echo.
echo 📋 Step 5: Initialize Capacitor (if needed)...
if not exist "capacitor.config.ts" (
    echo 🔧 Initializing Capacitor...
    npx cap init "Work Schedule" "com.narayya.workschedule"
    if errorlevel 1 (
        echo ❌ Capacitor init failed
        pause
        exit /b 1
    )
) else (
    echo ✅ Capacitor already initialized
)

echo.
echo 📋 Step 6: Create Android platform...
if exist "android" (
    echo ⚠️ Android folder already exists, removing it...
    rmdir /s /q android
)

echo 📱 Adding Android platform...
npx cap add android
if errorlevel 1 (
    echo ❌ Failed to add Android platform
    echo 🔧 This might be due to missing Android SDK
    pause
    exit /b 1
)

echo ✅ Android platform created successfully!
echo.

echo 📋 Step 7: Copy web assets to Android...
npx cap copy android
if errorlevel 1 (
    echo ❌ Failed to copy assets
    pause
    exit /b 1
)

echo.
echo 📋 Step 8: Sync Capacitor...
npx cap sync android
if errorlevel 1 (
    echo ❌ Failed to sync
    pause
    exit /b 1
)

echo ✅ Android platform setup complete!
echo.

echo 📋 Step 9: Verify Android folder was created...
if exist "android" (
    echo ✅ Android folder created successfully!
    echo 📂 Contents of android folder:
    dir android /b
    echo.
    
    echo 📋 Step 10: Try to build APK with Gradle...
    cd android
    
    if exist "gradlew.bat" (
        echo 🔨 Building APK...
        echo This may take several minutes...
        
        gradlew.bat assembleDebug
        
        if exist "app\build\outputs\apk\debug\app-debug.apk" (
            echo.
            echo 🎉 SUCCESS! APK built successfully!
            echo.
            echo 📱 APK Location: %CD%\app\build\outputs\apk\debug\app-debug.apk
            
            for %%A in ("app\build\outputs\apk\debug\app-debug.apk") do (
                set /a sizeMB=%%~zA/1024/1024
                echo 📊 APK Size: !sizeMB! MB
            )
            
            echo.
            echo 🎯 Your APK is ready to install on Android devices!
            echo.
            echo 📋 To install:
            echo 1. Enable "Unknown Sources" on your Android device
            echo 2. Transfer the APK file to your device
            echo 3. Open the APK file to install
            
        ) else (
            echo ❌ APK not found after build
            echo 🔧 Opening Android Studio for manual build...
            cd ..
            npx cap open android
            echo.
            echo 📋 In Android Studio:
            echo 1. Wait for Gradle sync to complete
            echo 2. Go to Build → Build Bundle(s) / APK(s) → Build APK(s)
            echo 3. Find APK at: android\app\build\outputs\apk\debug\app-debug.apk
        )
    ) else (
        echo ❌ Gradle wrapper not found
        echo 🔧 Opening Android Studio...
        cd ..
        npx cap open android
    )
    
    cd ..
    
) else (
    echo ❌ Android folder was not created!
    echo 🔧 This indicates a problem with Capacitor or Android SDK setup
    echo.
    echo 💡 Possible issues:
    echo 1. Android SDK not installed
    echo 2. ANDROID_HOME not set
    echo 3. Java not installed
    echo.
    echo 📋 Please install Android Studio and set up environment variables
    echo Then run this script again.
)

echo.
echo 🎉 Script completed!
pause