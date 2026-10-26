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
if ($LASTEXITCODE -ne 0) { throw "Falha ao gerar instalador." }

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

($manifest | ConvertTo-Json -Depth 4) + "`n" | Set-Content -LiteralPath "dist\latest.json" -Encoding UTF8

Write-Host "Manifesto preparado: dist\latest.json (ainda nao anunciado aos clientes)"
Write-Host "Instalador: $installer"
Write-Host "Release esperada: $releaseUrl"

if ($CreateGithubRelease) {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if (-not $gh) {
    throw "GitHub CLI (gh) nao encontrado. Instale ou crie a release manualmente."
  }
  gh release view $releaseTag *> $null
  if ($LASTEXITCODE -ne 0) {
    gh release create $releaseTag --draft --title "Griffy Store $version" --notes $Notes
    if ($LASTEXITCODE -ne 0) { throw "Falha ao criar release." }
  }
  $portable = Join-Path $root "dist\Griffy-Store-Portable-$version.zip"
  Compress-Archive -Path "dist\win-unpacked\*" -DestinationPath $portable -Force
  gh release upload $releaseTag $installer "$installer.blockmap" "dist\latest.yml" "dist\latest.json" $portable --clobber
  if ($LASTEXITCODE -ne 0) { throw "Falha ao enviar arquivos; o manifesto publico nao foi alterado." }
  gh release edit $releaseTag --draft=false --latest
  if ($LASTEXITCODE -ne 0) { throw "Falha ao publicar release." }
  Copy-Item -LiteralPath "dist\latest.json" -Destination "updates\latest.json"
  Write-Host "Release publicada. Envie updates/latest.json ao Git para os clientes legados."
}

