#!/bin/bash

# Build Android APK Script for Work Schedule App
# Created by NARAYYA

echo "🚀 Starting Android APK build process..."

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
echo ""
echo "📱 Next steps:"
echo "1. Open Android Studio: npx cap open android"
echo "2. Build APK in Android Studio or run: cd android && ./gradlew assembleDebug"
echo "3. Find your APK in: android/app/build/outputs/apk/debug/"
echo ""
echo "🎉 Setup completed successfully!"