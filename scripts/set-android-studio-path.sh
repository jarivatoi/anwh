#!/bin/bash

# Set Android Studio Path Script
# Created by NARAYYA

echo "🔧 Setting Android Studio path for Capacitor..."

# Function to set environment variable permanently
set_permanent_env() {
    local var_name="$1"
    local var_value="$2"
    local shell_profile=""
    
    # Detect shell and set appropriate profile file
    if [ -n "$ZSH_VERSION" ]; then
        shell_profile="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        shell_profile="$HOME/.bashrc"
    else
        shell_profile="$HOME/.profile"
    fi
    
    echo "📝 Adding $var_name to $shell_profile"
    echo "export $var_name=\"$var_value\"" >> "$shell_profile"
    echo "✅ Added to $shell_profile"
    echo "🔄 Please run: source $shell_profile"
}

# Search for Android Studio
echo "🔍 Searching for Android Studio installation..."

STUDIO_PATHS=(
    "/opt/android-studio/bin/studio.sh"
    "/usr/local/android-studio/bin/studio.sh"
    "$HOME/android-studio/bin/studio.sh"
    "/Applications/Android Studio.app/Contents/bin/studio.sh"  # macOS
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
    echo "Please manually specify the path to studio.sh"
    echo
    echo "Usage: $0 /path/to/android-studio/bin/studio.sh"
    echo
    echo "Common locations:"
    echo "  Linux: /opt/android-studio/bin/studio.sh"
    echo "  macOS: /Applications/Android Studio.app/Contents/bin/studio.sh"
    exit 1
fi

# If path provided as argument, use that instead
if [ $# -eq 1 ]; then
    if [ -f "$1" ]; then
        FOUND_PATH="$1"
        echo "✅ Using provided path: $FOUND_PATH"
    else
        echo "❌ Provided path does not exist: $1"
        exit 1
    fi
fi

# Set environment variable for current session
export CAPACITOR_ANDROID_STUDIO_PATH="$FOUND_PATH"
echo "✅ Set CAPACITOR_ANDROID_STUDIO_PATH for current session"

# Ask user if they want to make it permanent
echo
read -p "Do you want to make this setting permanent? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    set_permanent_env "CAPACITOR_ANDROID_STUDIO_PATH" "$FOUND_PATH"
    echo
    echo "🎉 Android Studio path configured successfully!"
    echo "🔄 Please restart your terminal or run: source ~/.bashrc (or ~/.zshrc)"
else
    echo "⚠️ Environment variable set for current session only"
    echo "To set permanently later, run:"
    echo "echo 'export CAPACITOR_ANDROID_STUDIO_PATH=\"$FOUND_PATH\"' >> ~/.bashrc"
fi

echo
echo "🧪 Testing the configuration..."
if [ -f "$CAPACITOR_ANDROID_STUDIO_PATH" ]; then
    echo "✅ Android Studio path is valid: $CAPACITOR_ANDROID_STUDIO_PATH"
    echo "🚀 You can now run: npx cap open android"
else
    echo "❌ Something went wrong. Path is not valid."
fi