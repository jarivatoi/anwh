@echo off
echo 🔍 Simple Directory Check
echo ========================
echo.

echo Current directory: %CD%
echo.

echo Checking for package.json...
if exist package.json (
    echo ✅ FOUND: package.json
) else (
    echo ❌ NOT FOUND: package.json
)

echo.
echo Listing all files:
dir /b
echo.

echo Done.
pause