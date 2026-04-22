@echo off
setlocal

REM Resolve paths relative to this script.
set "SCRIPT_DIR=%~dp0"
set "REPO_ROOT=%SCRIPT_DIR%..\.."
set "CONFIG_PATH=%SCRIPT_DIR%configs\socialmedia_disaster_pytorch_tensorboard.json"
set "RUN_ID=%~1"

if "%RUN_ID%"=="" set "RUN_ID=local_pytorch_tb_run"

echo [PHOENIX] Running training pipeline...
echo   Config : %CONFIG_PATH%
echo   Run ID : %RUN_ID%

python "%SCRIPT_DIR%src\main.py" --config "%CONFIG_PATH%" --run-id "%RUN_ID%"
if errorlevel 1 (
  echo [PHOENIX] Pipeline failed.
  exit /b 1
)

echo [PHOENIX] Launching TensorBoard on http://localhost:6006 ...
start "" tensorboard --logdir "%SCRIPT_DIR%logs\tensorboard" --port 6006

echo [PHOENIX] Done.
echo [PHOENIX] Close this window if no longer needed.
exit /b 0
