param(
  [Parameter(Mandatory = $true)]
  [string]$Path,

  [string]$MysqlExe = "C:\xampp\mysql\bin\mysql.exe",
  [string]$HostName = "127.0.0.1",
  [int]$Port = 3306,
  [string]$User = "root",
  [string]$Database = "griffy_store"
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.Security

function Read-ZipEntryText($zip, $name) {
  $entry = $zip.GetEntry($name)
  if (-not $entry) { return "" }
  $reader = [System.IO.StreamReader]::new($entry.Open())
  try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Get-CellColumnIndex($reference) {
  $letters = ($reference -replace "\d", "")
  $number = 0
  foreach ($char in $letters.ToCharArray()) {
    $number = ($number * 26) + ([int][char]$char - [int][char]"A" + 1)
  }
  return $number
}

function Remove-Diacritics($text) {
  if ($null -eq $text) { return "" }
  $normalized = $text.Normalize([Text.NormalizationForm]::FormD)
  $builder = [Text.StringBuilder]::new()
  foreach ($char in $normalized.ToCharArray()) {
    $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
    if ($category -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$builder.Append($char)
    }
  }
  return $builder.ToString().Normalize([Text.NormalizationForm]::FormC)
}

function Normalize-Header($text) {
  return (Remove-Diacritics $text).Trim().ToUpperInvariant()
}

function Normalize-CategoryName($text) {
  $raw = ([string]$text).Trim()
  if ($raw -eq "") { return "SEM CATEGORIA" }
  $key = Normalize-Header $raw
  $catBolsaAgua = "BOLSA A PROVA D'" + [char]0x00C1 + "GUA"
  $catCopoTermico = "COPO T" + [char]0x00C9 + "RMICO"
  $catLuzVideo = "LUZ PARA V" + [char]0x00CD + "DEO"
  $catMaquininhaPe = "MAQUININHA DE APARAR P" + [char]0x00C9
  $catPeliculaCamera = "PEL" + [char]0x00CD + "CULA DE C" + [char]0x00C2 + "MERA"
  $catPeliculas = "PEL" + [char]0x00CD + "CULAS"
  $catPerfumes = "PERFUMES " + [char]0x00C1 + "RABES"
  $map = @{
    "ADAPTADOR DE ENERGIA" = "ADAPTADOR DE ENERGIA"
    "BOLSA APROVA D'AGUA" = $catBolsaAgua
    "BOLSA A PROVA D'AGUA" = $catBolsaAgua
    "CABOS DE CARREGADOR" = "CABOS DE CARREGADOR"
    "CAPAS" = "CAPAS"
    "CARREGADOR COMPLETO" = "CARREGADOR COMPLETO"
    "CARREGADOR VEICULAR" = "CARREGADOR VEICULAR"
    "CHIP" = "CHIP"
    "COPO TERMICO" = $catCopoTermico
    "FONES" = "FONES"
    "HOVERBOARD" = "HOVERBOARD"
    "IPHONES" = "IPHONES"
    "JBL" = "JBL"
    "LUX PARA VIDEO" = $catLuzVideo
    "LUZ PARA VIDEO" = $catLuzVideo
    "MAQUININHA DE APARAR PE" = $catMaquininhaPe
    "MAQUININHA DE APARAR PELOS" = $catMaquininhaPe
    "PELICULA DE CAMERA" = $catPeliculaCamera
    "PELICULAS" = $catPeliculas
    "PENDRIVE" = "PENDRIVE"
    "PERFURMES ARABES" = $catPerfumes
    "PERFUMES ARABES" = $catPerfumes
    "POWER BANCK" = "POWER BANK"
    "POWER BANK" = "POWER BANK"
    "RASTREADOR DE DISPOSITIVO" = "RASTREADOR DE DISPOSITIVO"
    "SMART WATCH" = "SMART WATCH"
    "SUPORTE DE CELULAR" = "SUPORTE DE CELULAR"
    "TECLADO DE COMPUTADOR" = "TECLADO DE COMPUTADOR"
    "UMIDIFICADOR" = "UMIDIFICADOR"
    "VIDEO GAMES" = "VIDEO GAMES"
  }
  if ($map.ContainsKey($key)) { return $map[$key] }
  return $key
}

function Get-SharedText($si) {
  $parts = New-Object System.Collections.Generic.List[string]
  function Add-TextNodes($node, $collector) {
    if ($node.LocalName -eq "t") {
      $collector.Add([string]$node.InnerText)
    }
    foreach ($child in $node.ChildNodes) {
      Add-TextNodes $child $collector
    }
  }
  Add-TextNodes $si $parts
  return ($parts -join "")
}

function Get-CellValue($cell, $sharedStrings) {
  $valueNode = $null
  foreach ($child in $cell.ChildNodes) {
    if ($child.LocalName -eq "v") {
      $valueNode = $child
      break
    }
  }
  if (-not $valueNode) { return "" }
  $value = [string]$valueNode.InnerText
  $type = [string]$cell.GetAttribute("t")
  if ($type -eq "s" -and $value -ne "") {
    return $sharedStrings[[int]$value]
  }
  return $value
}

function To-DecimalText($value) {
  $raw = ([string]$value).Trim()
  if ($raw -eq "") { return "0" }
  $raw = $raw -replace "\.", ""
  $raw = $raw -replace ",", "."
  $number = 0.0
  if ([double]::TryParse($raw, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
    return $number.ToString("0.00", [Globalization.CultureInfo]::InvariantCulture)
  }
  return "0"
}

function To-IntText($value) {
  $raw = ([string]$value).Trim()
  if ($raw -eq "") { return "0" }
  $number = 0.0
  if ([double]::TryParse(($raw -replace ",", "."), [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
    return [string][int][Math]::Round($number)
  }
  return "0"
}

function Sql-String($value) {
  $text = ([string]$value).Trim()
  if ($text -eq "") { return "NULL" }
  $text = $text.Replace("\", "\\").Replace("'", "''")
  return "'$text'"
}

function Sql-Date($value) {
  $raw = ([string]$value).Trim()
  if ($raw -eq "") { return "NULL" }
  $number = 0.0
  if ([double]::TryParse($raw, [Globalization.NumberStyles]::Any, [Globalization.CultureInfo]::InvariantCulture, [ref]$number)) {
    $date = [DateTime]::FromOADate($number)
    return "'" + $date.ToString("yyyy-MM-dd") + "'"
  }
  $dateValue = [DateTime]::MinValue
  if ([DateTime]::TryParse($raw, [ref]$dateValue)) {
    return "'" + $dateValue.ToString("yyyy-MM-dd") + "'"
  }
  return "NULL"
}

function Stable-Id($code, $name, $category) {
  if (-not [string]::IsNullOrWhiteSpace($code)) {
    return "imp_" + (($code -replace "[^A-Za-z0-9]", "")).Substring(0, [Math]::Min(32, ($code -replace "[^A-Za-z0-9]", "").Length))
  }
  $bytes = [Text.Encoding]::UTF8.GetBytes("$name|$category")
  $sha = [Security.Cryptography.SHA1]::Create()
  $hash = ($sha.ComputeHash($bytes) | ForEach-Object { $_.ToString("x2") }) -join ""
  return "imp_" + $hash.Substring(0, 28)
}

if (-not (Test-Path -LiteralPath $Path)) {
  throw "Arquivo nao encontrado: $Path"
}
if (-not (Test-Path -LiteralPath $MysqlExe)) {
  throw "mysql.exe nao encontrado: $MysqlExe"
}

$zip = [System.IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $Path))
try {
  [xml]$sharedXml = Read-ZipEntryText $zip "xl/sharedStrings.xml"
  $sharedStrings = @()
  foreach ($si in $sharedXml.DocumentElement.ChildNodes) {
    $sharedStrings += Get-SharedText $si
  }

  [xml]$sheetXml = Read-ZipEntryText $zip "xl/worksheets/sheet1.xml"
  $rows = $sheetXml.SelectNodes("//*[local-name()='row']")
  $headerRow = $rows.Item(0)
  $headers = @{}
  foreach ($cell in $headerRow.ChildNodes) {
    $column = Get-CellColumnIndex ([string]$cell.GetAttribute("r"))
    $headers[(Normalize-Header (Get-CellValue $cell $sharedStrings))] = $column
  }
  $requiredHeaders = @("CODIGO", "DESCRICAO", "FORNECEDOR", "CATEGORIA", "SUBCATEGORIA", "UNIDADE", "CUSTO", "VAREJO", "ATACADO", "LOTE", "ESTOQUE MINIMO", "QUANTIDADE", "VALIDADE", "CAPA")
  foreach ($required in $requiredHeaders) {
    if (-not $headers.ContainsKey($required)) {
      $firstCell = $headerRow.ChildNodes | Select-Object -First 1
      $firstValue = if ($firstCell) { Get-CellValue $firstCell $sharedStrings } else { "" }
      throw "Coluna obrigatoria nao encontrada: $required. Linhas: $($rows.Count). Celulas cabecalho: $($headerRow.ChildNodes.Count). Primeiro valor: '$firstValue'. Encontradas: $($headers.Keys -join ', ')"
    }
  }

  $sqlLines = New-Object System.Collections.Generic.List[string]
  $sqlLines.Add("SET NAMES utf8mb4;")
  $sqlLines.Add("START TRANSACTION;")
  $count = 0
  $categories = [System.Collections.Generic.HashSet[string]]::new()

  for ($rowIndex = 1; $rowIndex -lt $rows.Count; $rowIndex++) {
    $row = $rows.Item($rowIndex)
    $values = @{}
    foreach ($cell in $row.ChildNodes) {
      $column = Get-CellColumnIndex ([string]$cell.GetAttribute("r"))
      $values[$column] = Get-CellValue $cell $sharedStrings
    }

    $code = $values[$headers["CODIGO"]]
    $name = $values[$headers["DESCRICAO"]]
    if ([string]::IsNullOrWhiteSpace($name)) { continue }

    $category = $values[$headers["CATEGORIA"]]
    $category = Normalize-CategoryName $category
    [void]$categories.Add($category)

    $id = Stable-Id $code $name $category
    $supplier = $values[$headers["FORNECEDOR"]]
    $subcategory = $values[$headers["SUBCATEGORIA"]]
    $unit = $values[$headers["UNIDADE"]]
    if ([string]::IsNullOrWhiteSpace($unit)) { $unit = "unidade" }
    $cost = To-DecimalText $values[$headers["CUSTO"]]
    $price = To-DecimalText $values[$headers["VAREJO"]]
    $wholesale = To-DecimalText $values[$headers["ATACADO"]]
    $lot = $values[$headers["LOTE"]]
    $minStock = To-IntText $values[$headers["ESTOQUE MINIMO"]]
    $stock = To-IntText $values[$headers["QUANTIDADE"]]
    $validity = Sql-Date $values[$headers["VALIDADE"]]
    $cover = $values[$headers["CAPA"]]

    $sqlLines.Add(@"
INSERT INTO products
  (id, code, name, category, subcategory, supplier, unit, stock, min_stock, cost, price, wholesale_price, lot, validity, cover)
VALUES
  ($(Sql-String $id), $(Sql-String $code), $(Sql-String $name), $(Sql-String $category), $(Sql-String $subcategory), $(Sql-String $supplier), $(Sql-String $unit), $stock, $minStock, $cost, $price, $wholesale, $(Sql-String $lot), $validity, $(Sql-String $cover))
ON DUPLICATE KEY UPDATE
  code = VALUES(code),
  name = VALUES(name),
  category = VALUES(category),
  subcategory = VALUES(subcategory),
  supplier = VALUES(supplier),
  unit = VALUES(unit),
  stock = VALUES(stock),
  min_stock = VALUES(min_stock),
  cost = VALUES(cost),
  price = VALUES(price),
  wholesale_price = VALUES(wholesale_price),
  lot = VALUES(lot),
  validity = VALUES(validity),
  cover = VALUES(cover);
"@)
    $count++
  }

  foreach ($category in $categories) {
    $sqlLines.Insert(2, "INSERT IGNORE INTO categories (name) VALUES ($(Sql-String $category));")
  }
  $sqlLines.Add("COMMIT;")

  $tmp = Join-Path $env:TEMP ("griffy-import-" + [guid]::NewGuid().ToString("N") + ".sql")
  [IO.File]::WriteAllLines($tmp, $sqlLines, [Text.UTF8Encoding]::new($false))
  try {
    $sourcePath = $tmp.Replace("\", "/")
    & $MysqlExe -h $HostName -P $Port -u $User $Database "--default-character-set=utf8mb4" "-e" "source $sourcePath"
    if ($LASTEXITCODE -ne 0) { throw "mysql.exe retornou codigo $LASTEXITCODE" }
  } finally {
    Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
  }

  [pscustomobject]@{
    ImportedRows = $count
    Categories = $categories.Count
    Database = $Database
  }
} finally {
  $zip.Dispose()
}
