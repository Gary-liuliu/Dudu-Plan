# [Script] Installs the Android build toolchain inside this project. [Warning] Never changes machine-level environment variables.
param(
  [string]$JdkSource = 'C:\Program Files\Java\jdk-17',
  [string]$AndroidSdkSeed = 'D:\XYJH\Tools\android-sdk'
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$localBuildRoot = Join-Path $projectRoot '.local-build'
$javaHome = Join-Path $localBuildRoot 'jdk'
$androidSdkRoot = Join-Path $localBuildRoot 'android-sdk'

New-Item -ItemType Directory -Force -Path $localBuildRoot | Out-Null

if (-not (Test-Path (Join-Path $javaHome 'bin\java.exe'))) {
  if (-not (Test-Path (Join-Path $JdkSource 'bin\java.exe'))) {
    throw "JDK 17 source not found at $JdkSource"
  }

  New-Item -ItemType Directory -Force -Path $javaHome | Out-Null
  Copy-Item -Path (Join-Path $JdkSource '*') -Destination $javaHome -Recurse -Force
}

$seedCommandLineTools = Join-Path $AndroidSdkSeed 'cmdline-tools\latest'
if (-not (Test-Path (Join-Path $seedCommandLineTools 'bin\sdkmanager.bat'))) {
  throw "Android command-line tools source not found at $seedCommandLineTools"
}

foreach ($relativeDirectory in @('cmdline-tools\latest', 'platform-tools', 'licenses')) {
  $sourceDirectory = Join-Path $AndroidSdkSeed $relativeDirectory
  $destinationDirectory = Join-Path $androidSdkRoot $relativeDirectory
  if ((Test-Path $sourceDirectory) -and -not (Test-Path $destinationDirectory)) {
    New-Item -ItemType Directory -Force -Path (Split-Path $destinationDirectory -Parent) | Out-Null
    Copy-Item -LiteralPath $sourceDirectory -Destination $destinationDirectory -Recurse -Force
  }
}

. (Join-Path $PSScriptRoot 'use-local-android-env.ps1')

$sdkManager = Join-Path $androidSdkRoot 'cmdline-tools\latest\bin\sdkmanager.bat'
$requiredPackages = @(
  'platform-tools',
  'platforms;android-36',
  'build-tools;36.0.0',
  'ndk;27.1.12297006',
  'cmake;3.30.5'
)

& $sdkManager "--sdk_root=$androidSdkRoot" @requiredPackages
if ($LASTEXITCODE -ne 0) {
  throw "Android SDK package installation failed with exit code $LASTEXITCODE"
}

$requiredPaths = @(
  'platforms\android-36\android.jar',
  'build-tools\36.0.0\aapt2.exe',
  'ndk\27.1.12297006\source.properties',
  'cmake\3.30.5\bin\cmake.exe'
)

foreach ($relativePath in $requiredPaths) {
  if (-not (Test-Path (Join-Path $androidSdkRoot $relativePath))) {
    throw "Required Android build component is missing: $relativePath"
  }
}

if (-not (Test-Path $env:DUDU_GRADLE_DISTRIBUTION) -or (Get-Item $env:DUDU_GRADLE_DISTRIBUTION).Length -lt 50MB) {
  $partialGradleDistribution = "$($env:DUDU_GRADLE_DISTRIBUTION).download"
  $gradleMirrors = @(
    'https://mirrors.cloud.tencent.com/gradle/gradle-9.3.1-bin.zip',
    'https://repo.huaweicloud.com/gradle/gradle-9.3.1-bin.zip',
    'https://mirrors.nju.edu.cn/gradle/gradle-9.3.1-bin.zip'
  )

  # Domestic mirrors avoid Gradle's GitHub redirect, which is often unreachable without VPN.
  foreach ($gradleMirror in $gradleMirrors) {
    Remove-Item -LiteralPath $partialGradleDistribution -Force -ErrorAction SilentlyContinue
    & curl.exe --location --fail --retry 3 --connect-timeout 30 --max-time 1200 --output $partialGradleDistribution $gradleMirror
    if ($LASTEXITCODE -eq 0 -and (Test-Path $partialGradleDistribution) -and (Get-Item $partialGradleDistribution).Length -ge 50MB) {
      break
    }
  }

  if (-not (Test-Path $partialGradleDistribution) -or (Get-Item $partialGradleDistribution).Length -lt 50MB) {
    throw "Gradle distribution download failed from all configured mirrors."
  }
  Move-Item -LiteralPath $partialGradleDistribution -Destination $env:DUDU_GRADLE_DISTRIBUTION -Force
}

Write-Output "Local Android build environment is ready at $localBuildRoot"
& (Join-Path $javaHome 'bin\java.exe') -version
& $sdkManager --version
