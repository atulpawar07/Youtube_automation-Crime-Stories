$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $projectRoot "tools"
$targetRoot = Join-Path $toolsRoot "ffmpeg"
$downloadPath = Join-Path $toolsRoot "ffmpeg-release-essentials.zip"
$extractRoot = Join-Path $toolsRoot "ffmpeg-extract"
$downloadUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

New-Item -ItemType Directory -Force -Path $toolsRoot | Out-Null

if (Test-Path (Join-Path $targetRoot "bin\ffmpeg.exe")) {
  Write-Host "Project-local ffmpeg is already installed."
  exit 0
}

if (Test-Path $targetRoot) {
  throw "Target directory already exists without ffmpeg.exe: $targetRoot"
}

if (Test-Path $extractRoot) {
  throw "Temporary extraction directory already exists: $extractRoot"
}

if ((Test-Path $downloadPath) -and ((Get-Item $downloadPath).Length -gt 50000000)) {
  Write-Host "Using the existing ffmpeg archive."
} else {
  if (Test-Path $downloadPath) {
    Remove-Item -LiteralPath $downloadPath
  }
  Write-Host "Downloading ffmpeg..."
  Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath
}

Write-Host "Extracting ffmpeg..."
Expand-Archive -LiteralPath $downloadPath -DestinationPath $extractRoot

$distributionRoot = Get-ChildItem -LiteralPath $extractRoot -Directory | Select-Object -First 1
if (-not $distributionRoot) {
  throw "Could not find the extracted ffmpeg directory."
}

$resolvedExtract = (Resolve-Path $extractRoot).Path
$resolvedDistribution = (Resolve-Path $distributionRoot.FullName).Path
if (-not $resolvedDistribution.StartsWith($resolvedExtract)) {
  throw "Refusing to move an extracted directory outside the expected workspace path."
}

Move-Item -LiteralPath $resolvedDistribution -Destination $targetRoot
Remove-Item -LiteralPath $downloadPath
Remove-Item -LiteralPath $extractRoot

if (-not (Test-Path (Join-Path $targetRoot "bin\ffmpeg.exe"))) {
  throw "ffmpeg.exe was not found after extraction."
}

Write-Host "Installed project-local ffmpeg at $targetRoot"
