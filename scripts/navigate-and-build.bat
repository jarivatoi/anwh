@echo off
echo 🧭 Project Navigation and Build Helper
echo ================================================================
echo.

echo 📍 Current directory: %CD%
echo.

echo 🔍 Looking for project files in current directory...
if exist "package.json" (
    echo ✅ Found package.json - You're in the right place!
    echo 🚀 Starting build process...
    call scripts\complete-setup-windows.bat
) else (
    echo ❌ package.json not found in current directory
    echo.
    echo 🔍 Searching for project in common locations...
    
    REM Check Desktop
    if exist "%USERPROFILE%\Desktop\work-schedule" (
        echo 📁 Found project at: %USERPROFILE%\Desktop\work-schedule
        cd /d "%USERPROFILE%\Desktop\work-schedule"
        call scripts\complete-setup-windows.bat
        goto :end
    )
    
    if exist "%USERPROFILE%\Desktop\vite-react-typescript-starter" (
        echo 📁 Found project at: %USERPROFILE%\Desktop\vite-react-typescript-starter
        cd /d "%USERPROFILE%\Desktop\vite-react-typescript-starter"
        call scripts\complete-setup-windows.bat
        goto :end
    )
    
    REM Check Documents
    if exist "%USERPROFILE%\Documents\work-schedule" (
        echo 📁 Found project at: %USERPROFILE%\Documents\work-schedule
        cd /d "%USERPROFILE%\Documents\work-schedule"
        call scripts\complete-setup-windows.bat
        goto :end
    )
    
    if exist "%USERPROFILE%\Documents\vite-react-typescript-starter" (
        echo 📁 Found project at: %USERPROFILE%\Documents\vite-react-typescript-starter
        cd /d "%USERPROFILE%\Documents\vite-react-typescript-starter"
        call scripts\complete-setup-windows.bat
        goto :end
    )
    
    echo ❌ Could not find project automatically
    echo.
    echo 📋 Manual steps:
    echo 1. Find your project folder (contains package.json, src folder, etc.)
    echo 2. Open Command Prompt in that folder:
    echo    - Right-click in the folder while holding Shift
    echo    - Select "Open PowerShell window here" or "Open command window here"
    echo    - Or use: cd "C:\path\to\your\project"
    echo 3. Run: scripts\complete-setup-windows.bat
    echo.
    echo 💡 Common project locations:
    echo    - Desktop
    echo    - Documents
    echo    - Downloads
    echo    - C:\Users\%USERNAME%\
    echo.
)

:end
pause