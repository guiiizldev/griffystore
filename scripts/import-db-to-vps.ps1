param(
  [Parameter(Mandatory = $true)]
  [string]$DumpPath,

  [string]$MysqlExe = "C:\xampp\mysql\bin\mysql.exe",

  [Parameter(Mandatory = $true)]
  [string]$HostName,

  [int]$Port = 3306,

  [Parameter(Mandatory = $true)]
  [string]$User,

  [string]$Password = "",

  [string]$Database = "griffy_store",

  [switch]$CreateDatabase
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $MysqlExe)) {
  throw "mysql.exe nao encontrado: $MysqlExe"
}

if (-not (Test-Path $DumpPath)) {
  throw "Dump nao encontrado: $DumpPath"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$defaultsFile = Join-Path ([System.IO.Path]::GetTempPath()) "griffy-mysql-$timestamp.cnf"

try {
  @(
    "[client]",
    "host=$HostName",
    "port=$Port",
    "user=$User",
    "password=$Password"
  ) | Set-Content -Path $defaultsFile -Encoding ASCII

  if ($CreateDatabase) {
    & $MysqlExe "--defaults-extra-file=$defaultsFile" -e "CREATE DATABASE IF NOT EXISTS $Database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    if ($LASTEXITCODE -ne 0) {
      throw "mysql retornou codigo $LASTEXITCODE ao criar o banco"
    }
  }

  Get-Content -Path $DumpPath -Raw | & $MysqlExe "--defaults-extra-file=$defaultsFile" $Database
  if ($LASTEXITCODE -ne 0) {
    throw "mysql retornou codigo $LASTEXITCODE ao importar o dump"
  }

  Write-Host "Importacao concluida em $HostName`:$Port/$Database"
} finally {
  if (Test-Path $defaultsFile) {
    Remove-Item -LiteralPath $defaultsFile -Force
  }
}
