@echo off
setlocal
set ANDROID_HOME=%USERPROFILE%\AppData\Local\Android\Sdk
set ANDROID_SDK_ROOT=%USERPROFILE%\AppData\Local\Android\Sdk

REM Remove stale builds so the server never serves an old APK
if exist "android-app\android\app\build\outputs\apk\debug\app-debug.apk" del /q "android-app\android\app\build\outputs\apk\debug\app-debug.apk"
if exist "android-app\android\app\build\outputs\apk\debug\TECHLAB-*.apk" del /q "android-app\android\app\build\outputs\apk\debug\TECHLAB-*.apk"
if exist "android-app\android\app\build\outputs\apk\debug\version.json" del /q "android-app\android\app\build\outputs\apk\debug\version.json"
if exist "android-app\android\app\build\outputs\apk\release" del /q "android-app\android\app\build\outputs\apk\release\*.apk" 2>nul
if exist "android-app\android\app\build\outputs\apk\release\version.json" del /q "android-app\android\app\build\outputs\apk\release\version.json" 2>nul

REM Generate timestamp-based version (readable) and versionCode (unix seconds, always increasing)
for /f "usebackq delims=" %%v in (`node -e "const d=new Date();const p=n=>String(n).padStart(2,'0');process.stdout.write(d.getFullYear()+'.'+p(d.getMonth()+1)+'.'+p(d.getDate())+'.'+p(d.getHours())+p(d.getMinutes()))"`) do set VERSION=%%v
for /f "usebackq delims=" %%c in (`node -e "process.stdout.write(String(Math.floor(Date.now()/1000)))"`) do set VERSIONCODE=%%c

cd android-app
call npm run build
if errorlevel 1 exit /b 1
call npx capacitor sync android
if errorlevel 1 exit /b 1
cd android
call gradlew assembleDebug -PversionCode=%VERSIONCODE% -PversionName=%VERSION%
if errorlevel 1 exit /b 1

REM Stamp the build: copy to a versioned filename and write version.json for the server
set OUTDIR=app\build\outputs\apk\debug
copy /y "%OUTDIR%\app-debug.apk" "%OUTDIR%\TECHLAB-%VERSION%.apk" >nul
node -e "const fs=require('fs'),path=require('path');const src=process.argv[1],ver=process.argv[2];const s=fs.statSync(src);fs.writeFileSync(path.join(path.dirname(src),'version.json'),JSON.stringify({version:ver,builtAt:s.mtime.toISOString(),filename:path.basename(src),size:s.size},null,2))" "%OUTDIR%\TECHLAB-%VERSION%.apk" "%VERSION%"

echo.
echo ============================================
echo   BUILD COMPLETE: TECHLAB-%VERSION%.apk
echo ============================================
