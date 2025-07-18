#!/bin/bash

# Setup Android development environment for Unix-like systems (Linux/macOS/WSL)
# Created by NARAYYA

echo "🔧 Setting up Android development environment for Unix-like systems"
echo

echo "📋 Checking system requirements..."

# Check Node.js
if command -v node > /dev/null 2>&1; then
    echo "✅ Node.js is installed"
    node --version
else
    echo "❌ Node.js is NOT installed"
    echo "📥 Please download and install Node.js from: https://nodejs.org/"
    echo
fi

# Check Java
if command -v java > /dev/null 2>&1; then
    echo "✅ Java is installed"
    java -version 2>&1 | head -1
else
    echo "❌ Java is NOT installed"
    echo "📥 Please download and install JDK 11+ from: https://adoptium.net/temurin/releases/"
    echo
fi

# Check JAVA_HOME
if [ -n "$JAVA_HOME" ]; then
    echo "✅ JAVA_HOME is set: $JAVA_HOME"
else
    echo "⚠️ JAVA_HOME environment variable is not set"
    echo "🔧 Please set JAVA_HOME to your JDK installation directory"
    echo "Example: export JAVA_HOME=/usr/lib/jvm/java-11-openjdk"
    echo
fi

# Check for Android Studio
echo "🔍 Searching for Android Studio..."
STUDIO_FOUND=false

# Common Android Studio paths
STUDIO_PATHS=(
    "/opt/android-studio/bin/studio.sh"
    "/usr/local/android-studio/bin/studio.sh"
    "$HOME/android-studio/bin/studio.sh"
    "/Applications/Android Studio.app/Contents/bin/studio.sh"  # macOS
)

for STUDIO_PATH in "${STUDIO_PATHS[@]}"; do
    if [ -f "$STUDIO_PATH" ]; then
        echo "✅ Android Studio found at: $STUDIO_PATH"
        STUDIO_FOUND=true
        FOUND_STUDIO_PATH="$STUDIO_PATH"
        break
    fi
done

if [ "$STUDIO_FOUND" = false ]; then
    echo "❌ Android Studio is NOT installed or not found in common locations"
    echo "📥 Please download and install from: https://developer.android.com/studio"
    echo
    echo "Common installation locations:"
    echo "  Linux: /opt/android-studio/ or /usr/local/android-studio/"
    echo "  macOS: /Applications/Android Studio.app/"
    echo
fi

# Check ANDROID_HOME
if [ -n "$ANDROID_HOME" ]; then
    echo "✅ ANDROID_HOME is set: $ANDROID_HOME"
else
    echo "⚠️ ANDROID_HOME environment variable is not set"
    echo "🔧 After installing Android Studio, set ANDROID_HOME to your SDK directory"
    echo "Example: export ANDROID_HOME=$HOME/Android/Sdk"
    echo
fi

# Check CAPACITOR_ANDROID_STUDIO_PATH
if [ -n "$CAPACITOR_ANDROID_STUDIO_PATH" ]; then
    echo "✅ CAPACITOR_ANDROID_STUDIO_PATH is set: $CAPACITOR_ANDROID_STUDIO_PATH"
else
    echo "⚠️ CAPACITOR_ANDROID_STUDIO_PATH environment variable is not set"
    if [ "$STUDIO_FOUND" = true ]; then
        echo "🔧 Setting CAPACITOR_ANDROID_STUDIO_PATH to found Android Studio path"
        echo "Run this command to set it permanently:"
        echo "echo 'export CAPACITOR_ANDROID_STUDIO_PATH=\"$FOUND_STUDIO_PATH\"' >> ~/.bashrc"
        echo "source ~/.bashrc"
        echo
        echo "Or set it temporarily for this session:"
        echo "export CAPACITOR_ANDROID_STUDIO_PATH=\"$FOUND_STUDIO_PATH\""
    else
        echo "🔧 Please set CAPACITOR_ANDROID_STUDIO_PATH after installing Android Studio"
    fi
    echo
fi

echo
echo "📋 Environment Setup Summary:"
echo "================================"

# Node.js check
if command -v node > /dev/null 2>&1; then
    echo "✅ Node.js: Ready"
else
    echo "❌ Node.js: Missing"
fi

# Java check
if command -v java > /dev/null 2>&1 && [ -n "$JAVA_HOME" ]; then
    echo "✅ Java: Ready"
elif command -v java > /dev/null 2>&1; then
    echo "⚠️ Java: Installed but JAVA_HOME not set"
else
    echo "❌ Java: Missing"
fi

# Android Studio check
if [ "$STUDIO_FOUND" = true ] && [ -n "$CAPACITOR_ANDROID_STUDIO_PATH" ]; then
    echo "✅ Android Studio: Ready"
elif [ "$STUDIO_FOUND" = true ]; then
    echo "⚠️ Android Studio: Installed but CAPACITOR_ANDROID_STUDIO_PATH not set"
else
    echo "❌ Android Studio: Missing"
fi

# Android SDK check
if [ -n "$ANDROID_HOME" ]; then
    echo "✅ Android SDK: Ready"
else
    echo "❌ Android SDK: Missing or ANDROID_HOME not set"
fi

echo
echo "🚀 Next Steps:"
echo "1. Install any missing components listed above"
echo "2. Set environment variables (JAVA_HOME, ANDROID_HOME, CAPACITOR_ANDROID_STUDIO_PATH)"
echo "3. Restart your terminal or run 'source ~/.bashrc'"
echo "4. Run: bash scripts/build-android.sh"
echo

# If Android Studio was found, provide the exact command to set the environment variable
if [ "$STUDIO_FOUND" = true ] && [ -z "$CAPACITOR_ANDROID_STUDIO_PATH" ]; then
    echo "🎯 Quick Fix - Run this command to set Android Studio path:"
    echo "export CAPACITOR_ANDROID_STUDIO_PATH=\"$FOUND_STUDIO_PATH\""
    echo
    echo "To make it permanent, add to your shell profile:"
    echo "echo 'export CAPACITOR_ANDROID_STUDIO_PATH=\"$FOUND_STUDIO_PATH\"' >> ~/.bashrc"
    echo "source ~/.bashrc"
    echo
fi