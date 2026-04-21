@echo off
setlocal enabledelayedexpansion

REM Ensure we run from the training_pipeline directory
cd /d "%~dp0"

echo.
echo ==========================================
echo   AI-ML Training Pipeline Runner
echo ==========================================
echo.
echo Enter config file path.
echo You can use absolute or relative paths.
echo Press Enter for default: configs\default_config.yaml
echo.

set "CONFIG_PATH="
set /p CONFIG_PATH=Config path: 

if "%CONFIG_PATH%"=="" (
    set "CONFIG_PATH=configs\default_config.yaml"
)

REM Trim accidental leading/trailing spaces from input
for /f "tokens=* delims= " %%A in ("%CONFIG_PATH%") do set "CONFIG_PATH=%%A"
:trim_tail
if "%CONFIG_PATH:~-1%"==" " (
    set "CONFIG_PATH=%CONFIG_PATH:~0,-1%"
    goto trim_tail
)

if not exist "%CONFIG_PATH%" (
    echo.
    echo [ERROR] Config file not found: "%CONFIG_PATH%"
    echo.
    pause
    exit /b 1
)

echo.
echo Running pipeline with config: "%CONFIG_PATH%"
echo.

python -m src.main --config "%CONFIG_PATH%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo [FAILED] Pipeline exited with code %EXIT_CODE%.
) else (
    echo [DONE] Pipeline finished successfully.
)
echo.
pause
exit /b %EXIT_CODE%
