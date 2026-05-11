@echo off

cd /d E:\OpenServer\domains\hh-telegram-autoraise

REM ---- лог старта ----
echo ================================ >> logs\run.log
echo [%date% %time%] START >> logs\run.log

REM ---- защита от параллельных запусков ----
if exist running.lock (
    echo [%date% %time%] Already running >> logs\run.log
    exit /b
)

echo started > running.lock

REM ---- запуск скрипта ----
echo [%date% %time%] Starting node script >> logs\run.log
node src\index.js >> logs\run.log 2>&1

REM ---- завершение ----
del running.lock
echo [%date% %time%] END >> logs\run.log

REM ---- пауза перед проверкой сна ----
echo [%date% %time%] Starting sleep check >> logs\run.log
timeout /t 10 >nul

REM ---- запуск проверки активности ----
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File E:\OpenServer\domains\hh-telegram-autoraise\sleep-check.ps1 >> logs\run.log 2>&1


exit
