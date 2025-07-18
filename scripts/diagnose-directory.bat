@echo off
echo 🔍 Diagnosing Directory Issue
echo ================================================================
echo.

echo 📍 Current working directory:
echo %CD%
echo.

echo 📂 Contents of current directory:
dir /b
echo.

echo 🔍 Checking for specific files:
if exist "package.json" (
    echo ✅ package.json EXISTS
    echo 📄 First few lines of package.json:
    type package.json | more /E +1 | head -5 2>nul || (
        echo [First 5 lines of package.json:]
        for /f "skip=0 tokens=* delims=" %%i in ('type package.json') do (
            echo %%i
            set /a count+=1
            if !count! geq 5 goto :done
        )
        :done
    )
) else (
    echo ❌ package.json NOT FOUND
)

if exist "src" (
    echo ✅ src folder EXISTS
) else (
    echo ❌ src folder NOT FOUND
)

if exist "index.html" (
    echo ✅ index.html EXISTS
) else (
    echo ❌ index.html NOT FOUND
)

if exist "capacitor.config.ts" (
    echo ✅ capacitor.config.ts EXISTS
) else (
    echo ⚠️ capacitor.config.ts NOT FOUND (will be created)
)

if exist "scripts" (
    echo ✅ scripts folder EXISTS
    echo 📂 Scripts available:
    dir scripts\*.bat /b 2>nul
) else (
    echo ❌ scripts folder NOT FOUND
)

echo.
echo 🧪 Testing file detection method:
if exist "package.json" (
    echo ✅ Method 1: 'if exist' works
) else (
    echo ❌ Method 1: 'if exist' fails
)

dir package.json >nul 2>&1
if errorlevel 1 (
    echo ❌ Method 2: 'dir' command fails
) else (
    echo ✅ Method 2: 'dir' command works
)

echo.
echo 🔧 Attempting to read package.json content:
if exist "package.json" (
    echo 📄 Package.json size:
    for %%A in (package.json) do echo %%~zA bytes
    echo.
    echo 📄 Package.json attributes:
    attrib package.json
) else (
    echo ❌ Cannot read package.json - file not accessible
)

echo.
echo 🎯 Recommendation:
if exist "package.json" (
    echo ✅ You ARE in the correct directory!
    echo 🚀 The issue might be with the batch file logic.
    echo 💡 Try running: scripts\complete-setup-windows.bat
) else (
    echo ❌ You are NOT in the correct project directory.
    echo 📁 Please navigate to the folder containing package.json
    echo 💡 Use: cd "C:\correct\path\to\your\project"
)

echo.
pause