@echo off
REM TECHLAB backup launcher. Runs the WAL-safe backup and ships the snapshot
REM to the off-box drive (ULTRA9 F:\OFC FILES\TECHLAB).
REM Designed to run ON THE SERVER (192.168.1.10) via Task Scheduler.
REM pushd handles both local and UNC project paths.
pushd "%~dp0"

set "NODE_EXE="
for /f "delims=" %%i in ('where node 2^>nul') do set "NODE_EXE=%%i"
if not defined NODE_EXE if exist "%ProgramFiles%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles%\nodejs\node.exe"
if not defined NODE_EXE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "NODE_EXE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined NODE_EXE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "NODE_EXE=%LocalAppData%\Programs\nodejs\node.exe"
if not defined NODE_EXE (
  echo ERROR: node not found in PATH or common install locations.
  popd
  exit /b 1
)

"%NODE_EXE%" backup.js
set EXITCODE=%ERRORLEVEL%
popd
exit /b %EXITCODE%
