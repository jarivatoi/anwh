#!/bin/bash

# Fix Android Dependencies Script
# Created by NARAYYA

echo "🔧 Fixing Android dependencies and build issues..."

# Step 1: Clean everything
echo "🧹 Cleaning project..."
rm -rf android
rm -rf node_modules/.cache
rm -rf dist

# Step 2: Rebuild web app
echo "🔨 Building web application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Web build failed. Please fix the errors and try again."
    exit 1
fi

# Step 3: Re-add Android platform
echo "📱 Re-adding Android platform..."
npx cap add android

# Step 4: Copy and sync
echo "📋 Copying assets and syncing..."
npx cap copy android
npx cap sync android

# Step 5: Fix Android project structure
echo "🔧 Fixing Android project structure..."

# Make gradlew executable
chmod +x android/gradlew

# Step 6: Clean and build Android project
echo "🧹 Cleaning Android project..."
cd android
./gradlew clean

echo "🔄 Syncing Gradle..."
./gradlew --refresh-dependencies

echo "✅ Android dependencies fixed!"
echo ""
echo "📱 Next steps:"
echo "1. Open Android Studio: npx cap open android"
echo "2. Let Gradle sync complete"
echo "3. Build → Build Bundle(s) / APK(s) → Build APK(s)"
echo ""
echo "🎉 Fix completed!"

cd ..