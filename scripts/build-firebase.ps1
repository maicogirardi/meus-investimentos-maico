$ErrorActionPreference = "Stop"

$configPath = Join-Path $PSScriptRoot "..\\vite.config.js"
$originalConfig = Get-Content -LiteralPath $configPath -Raw
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

try {
  $firebaseConfig = $originalConfig -replace "base:\s*'/meus-investimentos-maico/'", "base: '/'"
  [System.IO.File]::WriteAllText($configPath, $firebaseConfig, $utf8NoBom)
  & npm.cmd run build
}
finally {
  [System.IO.File]::WriteAllText($configPath, $originalConfig, $utf8NoBom)
}
