$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

if (!(Test-Path ".env")) {
  Write-Host "Missing .env file. Create it from .env.example and add your database settings."
  exit 1
}

Get-Content ".env" | ForEach-Object {
  if ($_ -and $_ -notmatch "^\s*#") {
    $parts = $_ -split "=", 2
    if ($parts.Length -eq 2) {
      [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), "Process")
    }
  }
}

if (!(Test-Path "node_modules")) {
  Write-Host "Installing dependencies..."
  npm install
}

$apiPort = if ($env:API_PORT) { $env:API_PORT } else { "3001" }

Write-Host "Starting SmartShift AI..."
Write-Host "API: http://localhost:$apiPort/api/docs"
Write-Host "Web: http://localhost:3000"

$api = Start-Process npm -ArgumentList "run dev:api" -NoNewWindow -PassThru
$web = Start-Process npm -ArgumentList "run dev:web" -NoNewWindow -PassThru

try {
  Wait-Process -Id $api.Id, $web.Id
}
finally {
  Write-Host "Stopping SmartShift AI..."
  Stop-Process -Id $api.Id, $web.Id -ErrorAction SilentlyContinue
}
