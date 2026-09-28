@echo off
title TECHLAB Server
set "PATH=%USERPROFILE%\node\node-v20.11.0-win-x64;%PATH%"
echo Starting TECHLAB server...
node server.js
pause
