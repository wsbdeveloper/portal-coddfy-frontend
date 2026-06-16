#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "==> Parando frontend Docker na porta 8080"
Push-Location $RepoRoot
try {
    docker compose down 2>$null | Out-Null
    docker rm -f ccm_frontend 2>$null | Out-Null
} finally {
    Pop-Location
}

& (Join-Path $PSScriptRoot "setup-iis-static.ps1") -ForceRebuild

Write-Host ""
Write-Host "==> Reiniciando IIS"
iisreset /noforce | Out-Null

Write-Host ""
Write-Host "==> Verificando porta 80"
Import-Module WebAdministration
Get-Website | ForEach-Object {
    $siteName = $_.Name
    Get-WebBinding -Name $siteName | Where-Object { $_.bindingInformation -match ":80:" } |
        ForEach-Object { "  $($_.bindingInformation) -> $siteName [$((Get-Website -Name $siteName).State)]" }
}

Write-Host ""
Write-Host "Acesse: http://localhost  (sem :8080)"
