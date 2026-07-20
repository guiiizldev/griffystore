param(
  [string]$MysqlDumpExe = "C:\xampp\mysql\bin\mysqldump.exe",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 3306,
  [string]$User = "root",
  [string]$Password = "",
  [string]$Database = "griffy_store",
  [string]$OutputDir = "database\backups"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MysqlDumpExe)) {
  throw "mysqldump.exe nao encontrado: $MysqlDumpExe"
}

if (-not (Test-Path $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputPath = Join-Path $OutputDir "$Database-$timestamp.sql"
$defaultsFile = Join-Path ([System.IO.Path]::GetTempPath()) "griffy-mysqldump-$timestamp.cnf"

try {
  @(
    "[client]",
    "host=$HostName",
    "port=$Port",
    "user=$User",
    "password=$Password"
  ) | Set-Content -Path $defaultsFile -Encoding ASCII

  & $MysqlDumpExe "--defaults-extra-file=$defaultsFile" --single-transaction --routines --triggers --databases $Database --result-file=$outputPath
  if ($LASTEXITCODE -ne 0) {
    throw "mysqldump retornou codigo $LASTEXITCODE"
  }

  Write-Host "Backup criado: $outputPath"
} finally {
  if (Test-Path $defaultsFile) {
    Remove-Item -LiteralPath $defaultsFile -Force
  }
}
