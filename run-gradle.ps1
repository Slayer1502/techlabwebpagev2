$env:ANDROID_HOME = "$env:USERPROFILE\AppData\Local\Android\Sdk"
$env:ANDROID_SDK_ROOT = "$env:USERPROFILE\AppData\Local\Android\Sdk"
Set-Location "E:\WPJ\webpage\android-app\android"
.\gradlew.bat assembleDebug