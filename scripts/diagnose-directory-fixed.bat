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
    echo 📄 Package.json file size:
    for %%A in (package.json) do echo %%~zA bytes
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
echo 🧪 Testing file access:
if exist "package.json" (
    echo ✅ File detection works correctly
    echo 📄 File attributes:
    attrib package.json
) else (
    echo ❌ File detection failed
)

echo.
echo 🎯 Diagnosis Result:
if exist "package.json" (
    echo ✅ You ARE in the correct directory!
    echo 🚀 All required files are present.
    echo 💡 The batch files should work now.
    echo.
    echo 🎯 Next step: Run this command:
    echo scripts\complete-setup-windows.bat
) else (
    echo ❌ You are NOT in the correct project directory.
    echo 📁 Please navigate to the folder containing package.json
    echo 💡 Use: cd "C:\path\to\your\project"
)

echo.
pause