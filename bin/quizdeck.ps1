$ErrorActionPreference = 'Stop'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  [Console]::Error.WriteLine('Quizdeck requires Node.js on PATH.')
  exit 1
}

& node (Join-Path $PSScriptRoot 'quizdeck.js') @args
exit $LASTEXITCODE
