# [Script] Generates and builds a project-local Android APK. [Warning] Default release signing is replaced only when local EAS credentials exist.
param(
  [ValidateSet('debug', 'release')]
  [string]$Variant = 'release',
  [string]$Architectures = 'arm64-v8a',
  [switch]$SkipPrebuild
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
. (Join-Path $PSScriptRoot 'use-local-android-env.ps1')

Push-Location $projectRoot
try {
  if (-not $SkipPrebuild) {
    $packageJsonPath = Join-Path $projectRoot 'package.json'
    $packageJsonBeforePrebuild = [IO.File]::ReadAllBytes($packageJsonPath)
    try {
      & (Join-Path $projectRoot 'node_modules\.bin\expo.cmd') prebuild --platform android --no-install
      if ($LASTEXITCODE -ne 0) {
        throw "Expo prebuild failed with exit code $LASTEXITCODE"
      }
    } finally {
      [IO.File]::WriteAllBytes($packageJsonPath, $packageJsonBeforePrebuild)
    }
  }

  $androidDirectory = Join-Path $projectRoot 'android'
  $wrapperPropertiesPath = Join-Path $androidDirectory 'gradle\wrapper\gradle-wrapper.properties'
  $wrapperProperties = [IO.File]::ReadAllText($wrapperPropertiesPath)
  if (-not (Test-Path $env:DUDU_GRADLE_DISTRIBUTION)) {
    throw "Project-local Gradle distribution is missing. Run npm.cmd run local:android:setup first."
  }
  $gradleDistributionUrl = ([Uri]$env:DUDU_GRADLE_DISTRIBUTION).AbsoluteUri.Replace(':', '\:')
  $wrapperProperties = [regex]::Replace($wrapperProperties, 'distributionUrl=.*', "distributionUrl=$gradleDistributionUrl")
  $wrapperProperties = [regex]::Replace($wrapperProperties, 'networkTimeout=\d+', 'networkTimeout=120000')
  [IO.File]::WriteAllText($wrapperPropertiesPath, $wrapperProperties)

  $sdkPathForGradle = $env:ANDROID_SDK_ROOT.Replace('\', '\\').Replace(':', '\:')
  [IO.File]::WriteAllText((Join-Path $androidDirectory 'local.properties'), "sdk.dir=$sdkPathForGradle`n")

  $gradleWrapper = Join-Path $androidDirectory 'gradlew.bat'
  $gradleInitScript = Join-Path $PSScriptRoot 'local-gradle-init.gradle'
  $gradleTask = if ($Variant -eq 'release') { 'app:assembleRelease' } else { 'app:assembleDebug' }
  & $gradleWrapper --init-script $gradleInitScript --project-dir $androidDirectory $gradleTask "-PreactNativeArchitectures=$Architectures" --no-daemon --console=plain --stacktrace
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle APK build failed with exit code $LASTEXITCODE"
  }

  $apkDirectory = Join-Path $androidDirectory "app\build\outputs\apk\$Variant"
  $sourceApk = Get-ChildItem -LiteralPath $apkDirectory -Filter '*.apk' -File |
    Sort-Object LastWriteTimeUtc |
    Select-Object -Last 1
  if (-not $sourceApk) {
    throw "Gradle completed but no APK was found under $apkDirectory"
  }

  $package = Get-Content -Raw (Join-Path $projectRoot 'package.json') | ConvertFrom-Json
  $architectureLabel = $Architectures.Replace(',', '-')
  $outputDirectory = Join-Path $projectRoot 'builds'
  $outputApk = Join-Path $outputDirectory "dudu-plan-$($package.version)-local-$Variant-$architectureLabel.apk"
  New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
  Copy-Item -LiteralPath $sourceApk.FullName -Destination $outputApk -Force

  Write-Output "APK ready: $outputApk"
} finally {
  Pop-Location
}
