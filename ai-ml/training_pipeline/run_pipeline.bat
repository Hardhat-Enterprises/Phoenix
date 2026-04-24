@echo off
setlocal enabledelayedexpansion

REM Run from this script's directory
cd /d "%~dp0"

set "SCRIPT_DIR=%~dp0"
set "DEFAULT_CONFIG=configs\socialmedia_disaster_pytorch_tensorboard.json"
set "RUN_ID=%~1"

if "%RUN_ID%"=="" set "RUN_ID=local_pytorch_tb_run"

echo.
echo ==========================================
echo   PHOENIX AI-ML Training Pipeline Runner
echo ==========================================
echo.
echo Enter config file path.
echo Press Enter for default: %DEFAULT_CONFIG%
echo.

set "CONFIG_PATH="
set /p CONFIG_PATH=Config path: 

if "%CONFIG_PATH%"=="" (
    set "CONFIG_PATH=%DEFAULT_CONFIG%"
)

REM Trim leading/trailing spaces
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
echo [PHOENIX] Running training pipeline...
echo   Config : %CONFIG_PATH%
echo   Run ID : %RUN_ID%
echo.

python -m src.main --config "%CONFIG_PATH%" --run-id "%RUN_ID%"
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo [PHOENIX] Pipeline failed with code %EXIT_CODE%.
    pause
    exit /b %EXIT_CODE%
)

echo [PHOENIX] Pipeline finished successfully.
echo.
echo [PHOENIX] Launching TensorBoard on http://localhost:6006 ...

start "" tensorboard --logdir "%SCRIPT_DIR%logs\tensorboard" --port 6006

echo.
echo [PHOENIX] Done.
echo [PHOENIX] Close this window if no longer needed.
echo.
pause
exit /b 0