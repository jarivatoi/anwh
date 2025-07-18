# Android Development Requirements

## System Requirements

### 1. Operating System
- **Windows**: Windows 10 (64-bit) or higher
- **macOS**: macOS 10.14 (API level 28) or higher
- **Linux**: Ubuntu 18.04 LTS or higher

### 2. Hardware Requirements
- **RAM**: Minimum 8GB (16GB recommended)
- **Storage**: At least 4GB free space for Android Studio
- **Processor**: Intel i5 or equivalent (i7 recommended)

### 3. Software Requirements

#### Java Development Kit (JDK)
```bash
# Check if Java is installed
java -version

# Should show Java 11 or higher
# If not installed, download from:
# https://adoptium.net/temurin/releases/
```

#### Android Studio
- Download from: https://developer.android.com/studio
- Includes Android SDK, AVD Manager, and build tools
- Latest stable version recommended

#### Node.js
```bash
# Check Node.js version
node --version

# Should be v16 or higher
# Download from: https://nodejs.org/
```

## Android Studio Setup

### 1. Initial Setup
1. Download and install Android Studio
2. Run Android Studio Setup Wizard
3. Install recommended SDK packages
4. Create or import a project

### 2. SDK Configuration
1. Open **Tools → SDK Manager**
2. Install the following:
   - **Android SDK Platform 33** (or latest)
   - **Android SDK Build-Tools 33.0.0** (or latest)
   - **Android Emulator**
   - **Android SDK Platform-Tools**
   - **Intel x86 Emulator Accelerator (HAXM installer)**

### 3. Virtual Device Setup
1. Open **Tools → AVD Manager**
2. Click **Create Virtual Device**
3. Choose a device (Pixel 4 recommended)
4. Select system image (API 33 recommended)
5. Configure AVD settings
6. Click **Finish**

### 4. Environment Variables (Required)

#### Windows
```cmd
# Add to System Environment Variables
ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
CAPACITOR_ANDROID_STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe

# Add to PATH
%ANDROID_HOME%\tools
%ANDROID_HOME%\platform-tools
```

#### macOS
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export CAPACITOR_ANDROID_STUDIO_PATH="/Applications/Android Studio.app/Contents/bin/studio.sh"
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

#### Linux
```bash
# Add to ~/.bashrc or ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$HOME/Android/Sdk
export CAPACITOR_ANDROID_STUDIO_PATH="/opt/android-studio/bin/studio.sh"
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools

# Alternative common Linux paths for Android Studio:
# export CAPACITOR_ANDROID_STUDIO_PATH="/usr/local/android-studio/bin/studio.sh"
# export CAPACITOR_ANDROID_STUDIO_PATH="$HOME/android-studio/bin/studio.sh"
```

**Important**: After setting environment variables, restart your terminal or run `source ~/.bashrc` (or `source ~/.zshrc`) to apply changes.

## Verification Steps

### 1. Check Android SDK
```bash
# Navigate to Android SDK location
cd $ANDROID_HOME/platform-tools

# Check ADB
./adb version
```

### 2. Check Capacitor CLI
```bash
# Install Capacitor CLI globally (optional)
npm install -g @capacitor/cli

# Check version
npx cap --version
```

### 3. Test Android Studio Path
```bash
# Verify Android Studio path is set correctly
echo $CAPACITOR_ANDROID_STUDIO_PATH

# Test if Android Studio can be launched
$CAPACITOR_ANDROID_STUDIO_PATH
```

### 4. Test Android Emulator
1. Open Android Studio
2. Start AVD Manager
3. Launch a virtual device
4. Verify it boots successfully

## Troubleshooting

### Common Issues

#### 1. "Unable to launch Android Studio" Error
- **Cause**: `CAPACITOR_ANDROID_STUDIO_PATH` not set or incorrect path
- **Solution**: 
  1. Find your Android Studio installation path
  2. Set `CAPACITOR_ANDROID_STUDIO_PATH` to the correct executable:
     - **Windows**: `C:\Program Files\Android\Android Studio\bin\studio64.exe`
     - **macOS**: `/Applications/Android Studio.app/Contents/bin/studio.sh`
     - **Linux**: `/opt/android-studio/bin/studio.sh` or `/usr/local/android-studio/bin/studio.sh`
  3. Restart terminal and test with `echo $CAPACITOR_ANDROID_STUDIO_PATH`

#### 2. "ANDROID_HOME not set"
- Set ANDROID_HOME environment variable
- Restart terminal/command prompt
- Verify with: `echo $ANDROID_HOME`

#### 3. "SDK not found"
- Open Android Studio
- Go to File → Project Structure → SDK Location
- Note the Android SDK location
- Set ANDROID_HOME to this path

#### 4. "Build tools not found"
- Open SDK Manager in Android Studio
- Install latest Android SDK Build-Tools
- Sync project

#### 5. "Emulator won't start"
- Enable Virtualization in BIOS
- Install Intel HAXM
- Increase RAM allocation for emulator

#### 6. "Gradle build failed"
- Check internet connection
- Clear Gradle cache: `./gradlew clean`
- Restart Android Studio

### Performance Tips

1. **Increase Android Studio memory**:
   - Help → Edit Custom VM Options
   - Add: `-Xmx4g` (for 4GB RAM allocation)

2. **Enable hardware acceleration**:
   - Ensure HAXM is installed
   - Enable VT-x in BIOS

3. **Use physical device for testing**:
   - Enable Developer Options
   - Enable USB Debugging
   - Install device drivers

## Ready to Build?

Once you have all requirements installed:

1. Run the build script: `bash scripts/build-android.sh`
2. Or follow manual steps in `android-setup-guide.md`
3. Open Android Studio: `npx cap open android`
4. Build your APK!

## Support

If you encounter issues:
1. Check Android Studio's built-in help
2. Visit: https://capacitorjs.com/docs/android
3. Android Developer documentation: https://developer.android.com/