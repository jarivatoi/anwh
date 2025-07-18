@echo off
echo 🔧 Setting up Android development environment for Windows
echo.

echo 📋 Checking system requirements...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is NOT installed
    echo 📥 Please download and install Node.js from: https://nodejs.org/
    echo.
) else (
    echo ✅ Node.js is installed
    node --version
)

REM Check Java
java -version >nul 2>&1
if errorlevel 1 (
    echo ❌ Java is NOT installed
    echo 📥 Please download and install JDK 11+ from: https://adoptium.net/temurin/releases/
    echo.
) else (
    echo ✅ Java is installed
    java -version 2>&1 | findstr "version"
)

REM Check JAVA_HOME
if "%JAVA_HOME%"=="" (
    echo ⚠️ JAVA_HOME environment variable is not set
    echo 🔧 Please set JAVA_HOME to your JDK installation directory
    echo Example: C:\Program Files\Eclipse Adoptium\jdk-11.0.19.7-hotspot\
    echo.
) else (
    echo ✅ JAVA_HOME is set: %JAVA_HOME%
)

REM Check Android Studio
echo 🔍 Searching for Android Studio...
set "STUDIO_FOUND=false"
set "FOUND_STUDIO_PATH="

REM Check common Android Studio paths
if exist "C:\Program Files\Android\Android Studio\bin\studio64.exe" (
    echo ✅ Android Studio found at: C:\Program Files\Android\Android Studio\bin\studio64.exe
    set "STUDIO_FOUND=true"
    set "FOUND_STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio64.exe"
    goto :studio_found
)

if exist "C:\Program Files\Android\Android Studio\bin\studio.exe" (
    echo ✅ Android Studio found at: C:\Program Files\Android\Android Studio\bin\studio.exe
    set "STUDIO_FOUND=true"
    set "FOUND_STUDIO_PATH=C:\Program Files\Android\Android Studio\bin\studio.exe"
    goto :studio_found
)

if exist "%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe" (
    echo ✅ Android Studio found at: %LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe
    set "STUDIO_FOUND=true"
    set "FOUND_STUDIO_PATH=%LOCALAPPDATA%\Programs\Android Studio\bin\studio64.exe"
    goto :studio_found
)

:studio_found
if "%STUDIO_FOUND%"=="false" (
    echo ❌ Android Studio is NOT installed or not found
    echo 📥 Please download and install from: https://developer.android.com/studio
    echo.
)

REM Check ANDROID_HOME
if "%ANDROID_HOME%"=="" (
    echo ⚠️ ANDROID_HOME environment variable is not set
    echo 🔧 After installing Android Studio, set ANDROID_HOME to your SDK directory
    echo Example: C:\Users\%USERNAME%\AppData\Local\Android\Sdk
    echo.
) else (
    echo ✅ ANDROID_HOME is set: %ANDROID_HOME%
)

REM Check CAPACITOR_ANDROID_STUDIO_PATH
if "%CAPACITOR_ANDROID_STUDIO_PATH%"=="" (
    echo ⚠️ CAPACITOR_ANDROID_STUDIO_PATH environment variable is not set
    if "%STUDIO_FOUND%"=="true" (
        echo 🔧 Found Android Studio, you can set the path with:
        echo setx CAPACITOR_ANDROID_STUDIO_PATH "%FOUND_STUDIO_PATH%"
    )
    echo.
) else (
    echo ✅ CAPACITOR_ANDROID_STUDIO_PATH is set: %CAPACITOR_ANDROID_STUDIO_PATH%
)

echo.
echo 📋 Environment Setup Summary:
echo ================================

REM Node.js check
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js: Missing
) else (
    echo ✅ Node.js: Ready
)

REM Java check
java -version >nul 2>&1
if errorlevel 1 (
    echo ❌ Java: Missing
) else (
    if "%JAVA_HOME%"=="" (
        echo ⚠️ Java: Installed but JAVA_HOME not set
    ) else (
        echo ✅ Java: Ready
    )
)

REM Android Studio check
if "%STUDIO_FOUND%"=="true" (
    if "%CAPACITOR_ANDROID_STUDIO_PATH%"=="" (
        echo ⚠️ Android Studio: Installed but CAPACITOR_ANDROID_STUDIO_PATH not set
    ) else (
        echo ✅ Android Studio: Ready
    )
) else (
    echo ❌ Android Studio: Missing
)

REM Android SDK check
if "%ANDROID_HOME%"=="" (
    echo ❌ Android SDK: Missing or ANDROID_HOME not set
) else (
    echo ✅ Android SDK: Ready
)

echo.
echo 🚀 Next Steps:
echo 1. Install any missing components listed above
echo 2. Set environment variables using the commands below
echo 3. Restart Command Prompt
echo 4. Run: scripts\build-apk-windows.bat
echo.

REM Provide exact commands if Android Studio was found
if "%STUDIO_FOUND%"=="true" (
    if "%CAPACITOR_ANDROID_STUDIO_PATH%"=="" (
        echo 🎯 Quick Fix - Run this command to set Android Studio path:
        echo setx CAPACITOR_ANDROID_STUDIO_PATH "%FOUND_STUDIO_PATH%"
        echo.
    )
)

echo 📝 Environment Variable Commands for Windows:
echo setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-11.0.19.7-hotspot"
echo setx ANDROID_HOME "C:\Users\%USERNAME%\AppData\Local\Android\Sdk"
if "%STUDIO_FOUND%"=="true" (
    echo setx CAPACITOR_ANDROID_STUDIO_PATH "%FOUND_STUDIO_PATH%"
)
echo.
pause