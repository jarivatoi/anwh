#!/bin/bash

# Direct APK Build Script (No Android Studio Required)
# Created by NARAYYA

echo "🚀 Building APK directly without Android Studio..."

# Check if Node.js is installed
if ! command -v node > /dev/null 2>&1; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm > /dev/null 2>&1; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the web app
echo "🔨 Building web application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Web build failed. Please fix the errors and try again."
    exit 1
fi

echo "✅ Web build completed successfully"

# Check if Capacitor is initialized
if [ ! -f "capacitor.config.ts" ]; then
    echo "🔧 Initializing Capacitor..."
    npx cap init "Work Schedule" "com.narayya.workschedule"
fi

# Add Android platform if it doesn't exist
if [ ! -d "android" ]; then
    echo "📱 Adding Android platform..."
    npx cap add android
fi

# Copy web assets to Android
echo "📋 Copying web assets to Android..."
npx cap copy android

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync android

echo "✅ Android project is ready!"

# Check if we're on a system that can build (has Java/Android SDK)
if command -v java > /dev/null 2>&1; then
    echo "☕ Java found, attempting to build APK..."
    
    # Navigate to android directory and build
    cd android
    
    # Make gradlew executable
    chmod +x gradlew
    
    # Build debug APK
    echo "🔨 Building debug APK..."
    ./gradlew assembleDebug
    
    if [ $? -eq 0 ]; then
        echo "🎉 APK built successfully!"
        echo "📱 Debug APK location: android/app/build/outputs/apk/debug/app-debug.apk"
        
        # Check if APK exists and show size
        if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
            APK_SIZE=$(du -h app/build/outputs/apk/debug/app-debug.apk | cut -f1)
            echo "📊 APK Size: $APK_SIZE"
        fi
    else
        echo "❌ APK build failed. You may need to:"
        echo "   1. Install Android SDK"
        echo "   2. Set ANDROID_HOME environment variable"
        echo "   3. Install Java Development Kit (JDK)"
    fi
    
    cd ..
else
    echo "⚠️  Java not found. Cannot build APK automatically."
    echo "📱 Android project is ready. To build APK:"
    echo "   1. Install Android Studio"
    echo "   2. Open the android folder in Android Studio"
    echo "   3. Build → Build Bundle(s) / APK(s) → Build APK(s)"
fi

echo ""
echo "📱 Next steps if APK build failed:"
echo "1. Install Android Studio from: https://developer.android.com/studio"
echo "2. Open Android Studio and import the 'android' folder"
echo "3. Build APK in Android Studio"
echo ""
echo "🎉 Setup completed!"