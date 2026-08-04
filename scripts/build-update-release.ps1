param(
  [string]$Notes = "Atualizacao Griffy Store",
  [switch]$Required,
  [switch]$CreateGithubRelease
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $root

$package = Get-Content -LiteralPath "package.json" -Raw | ConvertFrom-Json
$version = [string]$package.version
$assetName = "Griffy-Store-Setup-$version.exe"
$releaseTag = "v$version"
$releaseUrl = "https://github.com/guiiizldev/griffystore/releases/download/$releaseTag/$assetName"

npm run build:win

$installer = Join-Path $root "dist\$assetName"
if (-not (Test-Path -LiteralPath $installer)) {
  throw "Instalador nao encontrado em $installer"
}

$hash = (Get-FileHash -LiteralPath $installer -Algorithm SHA256).Hash.ToLowerInvariant()
$size = (Get-Item -LiteralPath $installer).Length

$manifest = [ordered]@{
  version = $version
  downloadUrl = $releaseUrl
  notes = $Notes
  required = [bool]$Required
  publishedAt = (Get-Date).ToUniversalTime().ToString("o")
  sha256 = $hash
  size = $size
}

New-Item -ItemType Directory -Force -Path "updates" | Out-Null
($manifest | ConvertTo-Json -Depth 4) + "`n" | Set-Content -LiteralPath "updates\latest.json" -Encoding UTF8

Write-Host "Manifesto atualizado: updates\latest.json"
Write-Host "Instalador: $installer"
Write-Host "Release esperada: $releaseUrl"

if ($CreateGithubRelease) {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if (-not $gh) {
    throw "GitHub CLI (gh) nao encontrado. Instale ou crie a release manualmente."
  }
  gh release view $releaseTag *> $null
  if ($LASTEXITCODE -ne 0) {
    gh release create $releaseTag $installer --title "Griffy Store $version" --notes $Notes
  } else {
    gh release upload $releaseTag $installer --clobber
  }
}

