#!/bin/bash

# Fix Capacitor Android Studio Path for Unix-like shells on Windows
# Created by NARAYYA

echo "🔧 Fixing Capacitor Android Studio Path for Unix-like shell on Windows"
echo

echo "🔍 Detecting your environment..."
echo "You're using a Unix-like shell (Git Bash/WSL) on Windows"
echo

# Convert Windows paths to Unix-like paths for the current shell session
STUDIO_PATHS=(
    "/c/Program Files/Android/Android Studio/bin/studio64.exe"
    "/c/Program Files/Android/Android Studio/bin/studio.exe"
    "/c/Users/$USER/AppData/Local/Programs/Android Studio/bin/studio64.exe"
)

FOUND_PATH=""

for path in "${STUDIO_PATHS[@]}"; do
    if [ -f "$path" ]; then
        echo "✅ Found Android Studio at: $path"
        FOUND_PATH="$path"
        break
    fi
done

if [ -z "$FOUND_PATH" ]; then
    echo "❌ Android Studio not found in common locations"
    echo "Please install Android Studio from: https://developer.android.com/studio"
    echo
    echo "Or manually set the path:"
    echo 'export CAPACITOR_ANDROID_STUDIO_PATH="/c/Program Files/Android/Android Studio/bin/studio64.exe"'
    exit 1
fi

# Set for current session
export CAPACITOR_ANDROID_STUDIO_PATH="$FOUND_PATH"
echo "✅ Set CAPACITOR_ANDROID_STUDIO_PATH for current session: $FOUND_PATH"

# Also set Android SDK path if it exists
ANDROID_SDK_PATH="/c/Users/$USER/AppData/Local/Android/Sdk"
if [ -d "$ANDROID_SDK_PATH" ]; then
    export ANDROID_HOME="$ANDROID_SDK_PATH"
    echo "✅ Set ANDROID_HOME for current session: $ANDROID_SDK_PATH"
fi

echo
echo "🧪 Testing the configuration..."
if [ -f "$CAPACITOR_ANDROID_STUDIO_PATH" ]; then
    echo "✅ Android Studio path is valid"
    echo "🚀 You can now run: npx cap open android"
else
    echo "❌ Path validation failed"
fi

echo
echo "📝 Current environment variables:"
echo "CAPACITOR_ANDROID_STUDIO_PATH=$CAPACITOR_ANDROID_STUDIO_PATH"
if [ -n "$ANDROID_HOME" ]; then
    echo "ANDROID_HOME=$ANDROID_HOME"
fi

echo
echo "⚠️  Note: These are temporary settings for this session only."
echo "To make permanent, add these lines to your ~/.bashrc or ~/.zshrc:"
echo "export CAPACITOR_ANDROID_STUDIO_PATH=\"$FOUND_PATH\""
if [ -n "$ANDROID_HOME" ]; then
    echo "export ANDROID_HOME=\"$ANDROID_SDK_PATH\""
fi