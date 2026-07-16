$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localBuildRoot = Join-Path $projectRoot '.local-build'
$javaHome = Join-Path $localBuildRoot 'jdk'
$androidSdkRoot = Join-Path $localBuildRoot 'android-sdk'
$androidUserHome = Join-Path $localBuildRoot 'android-user-home'
$gradleUserHome = Join-Path $localBuildRoot 'gradle-home'
$npmCache = Join-Path $localBuildRoot 'npm-cache'
$expoHome = Join-Path $localBuildRoot 'expo-home'
$downloadsDirectory = Join-Path $localBuildRoot 'downloads'
$localUserHome = Join-Path $localBuildRoot 'user-home'
$localAppData = Join-Path $localUserHome 'AppData\Local'
$localRoamingAppData = Join-Path $localUserHome 'AppData\Roaming'
$kotlinDaemonDirectory = Join-Path $localBuildRoot 'kotlin-daemon'
$temporaryDirectory = Join-Path $localBuildRoot 'tmp'

foreach ($directory in @($androidUserHome, $gradleUserHome, $npmCache, $expoHome, $downloadsDirectory, $localAppData, $localRoamingAppData, $kotlinDaemonDirectory, $temporaryDirectory)) {
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
}

if (-not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) {
  throw "Project-local JDK is missing. Run npm.cmd run local:android:setup first."
}

if (-not (Test-Path (Join-Path $androidSdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'))) {
  throw "Project-local Android SDK is missing. Run npm.cmd run local:android:setup first."
}

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $androidSdkRoot
$env:ANDROID_SDK_ROOT = $androidSdkRoot
$env:ANDROID_USER_HOME = $androidUserHome
$env:GRADLE_USER_HOME = $gradleUserHome
$env:NPM_CONFIG_CACHE = $npmCache
$env:EXPO_HOME = $expoHome
$env:HOME = $localUserHome
$env:USERPROFILE = $localUserHome
$env:HOMEDRIVE = [IO.Path]::GetPathRoot($localUserHome).TrimEnd('\')
$env:HOMEPATH = $localUserHome.Substring($env:HOMEDRIVE.Length)
$env:LOCALAPPDATA = $localAppData
$env:APPDATA = $localRoamingAppData
$env:KOTLIN_DAEMON_RUNFILES_PATH = $kotlinDaemonDirectory
$env:TEMP = $temporaryDirectory
$env:TMP = $temporaryDirectory
$env:NODE_OPTIONS = '--max-old-space-size=8192 --dns-result-order=ipv4first'
$env:PATH = @(
  (Join-Path $javaHome 'bin'),
  (Join-Path $androidSdkRoot 'cmdline-tools\latest\bin'),
  (Join-Path $androidSdkRoot 'platform-tools'),
  $env:PATH
) -join [IO.Path]::PathSeparator

$env:DUDU_LOCAL_BUILD_ROOT = $localBuildRoot
$env:DUDU_GRADLE_DISTRIBUTION = Join-Path $downloadsDirectory 'gradle-9.3.1-bin.zip'
$env:DUDU_KOTLIN_DAEMON_DIRECTORY = $kotlinDaemonDirectory
