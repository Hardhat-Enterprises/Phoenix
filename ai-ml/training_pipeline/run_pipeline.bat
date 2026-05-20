@echo off
setlocal enabledelayedexpansion

REM Run from this script's directory
cd /d "%~dp0"

set "SCRIPT_DIR=%~dp0"
set "DEFAULT_CONFIG=configs\socialmedia_disaster_pytorch_tensorboard.json"
set "RUN_ID=%~1"
set "DEFAULT_TENSORBOARD_PORT=6006"
set "CONDA_EXE=%USERPROFILE%\miniconda3\Scripts\conda.exe"

if not exist "%CONDA_EXE%" (
    set "CONDA_EXE=conda"
)

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
echo Enter resume checkpoint path, or press Enter for a fresh run.
set "RESUME_PATH="
set /p RESUME_PATH=Resume checkpoint: 

echo.
echo Enter epoch override, or press Enter to use config value.
set "EPOCH_OVERRIDE="
set /p EPOCH_OVERRIDE=Epochs: 

echo.
echo Enter TensorBoard port.
echo Press Enter for default: %DEFAULT_TENSORBOARD_PORT%
set "TENSORBOARD_PORT="
set /p TENSORBOARD_PORT=TensorBoard port: 
if "%TENSORBOARD_PORT%"=="" set "TENSORBOARD_PORT=%DEFAULT_TENSORBOARD_PORT%"

echo.
echo [PHOENIX] Launching TensorBoard in a separate CLI...
echo [PHOENIX] TensorBoard URL: http://localhost:%TENSORBOARD_PORT%
start "PHOENIX TensorBoard" cmd /k ""%CONDA_EXE%" run -n phoenix tensorboard --logdir "logs\tensorboard" --port %TENSORBOARD_PORT%"

echo.
echo [PHOENIX] Running training pipeline...
echo   Config : %CONFIG_PATH%
echo   Run ID : %RUN_ID%
echo   Conda  : phoenix
if not "%RESUME_PATH%"=="" echo   Resume : %RESUME_PATH%
if not "%EPOCH_OVERRIDE%"=="" echo   Epochs : %EPOCH_OVERRIDE%
echo.

if "%RESUME_PATH%"=="" (
    if "%EPOCH_OVERRIDE%"=="" (
        "%CONDA_EXE%" run -n phoenix python -m src.main --config "%CONFIG_PATH%" --run-id "%RUN_ID%"
    ) else (
        "%CONDA_EXE%" run -n phoenix python -m src.main --config "%CONFIG_PATH%" --run-id "%RUN_ID%" --epochs %EPOCH_OVERRIDE%
    )
) else (
    if "%EPOCH_OVERRIDE%"=="" (
        "%CONDA_EXE%" run -n phoenix python -m src.main --config "%CONFIG_PATH%" --run-id "%RUN_ID%" --resume-from "%RESUME_PATH%"
    ) else (
        "%CONDA_EXE%" run -n phoenix python -m src.main --config "%CONFIG_PATH%" --run-id "%RUN_ID%" --resume-from "%RESUME_PATH%" --epochs %EPOCH_OVERRIDE%
    )
)
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" (
    echo [PHOENIX] Pipeline failed with code %EXIT_CODE%.
    pause
    exit /b %EXIT_CODE%
)

echo [PHOENIX] Pipeline finished successfully.
echo.
echo [PHOENIX] Done.
echo [PHOENIX] Close this window if no longer needed.
echo.
pause
exit /b 0
