$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$env:EAS_NO_VCS = '1'
$env:EAS_PROJECT_ROOT = $projectRoot
$env:NODE_OPTIONS = '--dns-result-order=ipv4first'

Push-Location $projectRoot
try {
  npx.cmd eas-cli@latest build --platform android --profile preview
} finally {
  Pop-Location
}
