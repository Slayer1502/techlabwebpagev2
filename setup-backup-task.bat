@echo off
REM ============================================================
REM  TECHLAB - Register the daily backup task ON THE SERVER.
REM  Run this ON the server machine (192.168.1.10) once.
REM  It reads the local repo (this folder) and writes snapshots
REM  to the off-box drive on ULTRA9 (\\192.168.1.15\F\OFC FILES).
REM ============================================================
setlocal
cd /d "%~dp0"

REM ---- Locate node.exe automatically ----
set "NODE_EXE="
for /f "delims=" %%i in ('where node 2^>nul') do set "NODE_EXE=%%i"
if not defined NODE_EXE (
  if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
)
if not defined NODE_EXE (
  if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
)
if not defined NODE_EXE (
  if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
)
if not defined NODE_EXE (
  echo ERROR: node.exe not found. Open a command prompt and run  ^"where node^"
  echo to find the path, then set NODE_EXE manually at the top of this file.
  pause
  exit /b 1
)

echo Using node at: %NODE_EXE%
echo.
echo Creating scheduled task 'TechlabDailyBackup' (daily at 23:00)...
echo.

REM ---- Choose the account the task runs as ----
REM Defaults to the currently logged-in user. That account must be able to
REM reach \\192.168.1.15\F\OFC FILES\TECHLAB (ULTRA9's F share).
REM If network access fails, add /RU "<user with write access to that share>".

schtasks /Create /TN "TechlabDailyBackup" ^
  /TR "\"%NODE_EXE%\" \"%~dp0backup.js\"" ^
  /SC DAILY /ST 23:00 /F

if errorlevel 1 (
  echo.
  echo Task creation FAILED. See message above.
  pause
  exit /b 1
)

echo.
echo SUCCESS. Task 'TechlabDailyBackup' registered. Next run: 23:00 daily.
echo.
echo NOTE: If the scheduled run reports 'cannot find the file' or network
echo access errors, the task account cannot reach \\192.168.1.15\F.
echo Re-run with:  schtasks /Create /TN TechlabDailyBackup /TR "..." /SC DAILY /ST 23:00 /RU "<known-account>" /F
echo.
pause
