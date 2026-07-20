param(
  [Parameter(Mandatory = $true)]
  [string]$HostName,

  [int]$Port = 3306,

  [Parameter(Mandatory = $true)]
  [string]$User,

  [string]$Password = "",

  [string]$Database = "griffy_store",

  [string]$EnvPath = ".env",

  [switch]$AlsoInstalledApp
)

$ErrorActionPreference = "Stop"

function Set-EnvValue {
  param(
    [string[]]$Lines,
    [string]$Key,
    [string]$Value
  )

  $escapedKey = [regex]::Escape($Key)
  $line = "$Key=$Value"
  $updated = $false
  $nextLines = foreach ($item in $Lines) {
    if ($item -match "^$escapedKey=") {
      $updated = $true
      $line
    } else {
      $item
    }
  }

  if (-not $updated) {
    $nextLines += $line
  }
  return $nextLines
}

function Update-EnvFile {
  param([string]$Path)

  $fullPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
  $dir = Split-Path -Parent $fullPath
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir | Out-Null
  }

  if (Test-Path $fullPath) {
    $lines = Get-Content $fullPath
  } elseif (Test-Path ".env.example") {
    $lines = Get-Content ".env.example"
  } else {
    $lines = @()
  }

  $lines = Set-EnvValue $lines "MYSQL_HOST" $HostName
  $lines = Set-EnvValue $lines "MYSQL_PORT" $Port
  $lines = Set-EnvValue $lines "MYSQL_USER" $User
  $lines = Set-EnvValue $lines "MYSQL_PASSWORD" $Password
  $lines = Set-EnvValue $lines "MYSQL_DATABASE" $Database
  Set-Content -Path $fullPath -Value $lines -Encoding UTF8
  Write-Host "Configurado: $fullPath"
}

Update-EnvFile $EnvPath

if ($AlsoInstalledApp) {
  $appData = [Environment]::GetFolderPath("ApplicationData")
  $candidateDirs = @(
    (Join-Path $appData "Griffy Store"),
    (Join-Path $appData "griffy-store-desktop")
  )

  foreach ($dir in $candidateDirs) {
    Update-EnvFile (Join-Path $dir ".env")
  }
}

Write-Host "Banco configurado para $User@$HostName`:$Port/$Database"
