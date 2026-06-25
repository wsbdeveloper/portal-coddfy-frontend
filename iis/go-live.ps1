#Requires -RunAsAdministrator
param(
    [string]$PublicHost = "portal.coddfy.com.br"
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot

Write-Host "==> Parando frontend Docker na porta 8080"
Push-Location $RepoRoot
try {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    docker compose down | Out-Null
    $ErrorActionPreference = $prev
} finally {
    Pop-Location
}

& (Join-Path $PSScriptRoot "open-firewall.ps1")
& (Join-Path $PSScriptRoot "install-iis-modules.ps1")
& (Join-Path $PSScriptRoot "setup-iis-static.ps1") -ForceRebuild -PublicHost $PublicHost -ApiUrl "/api"

Write-Host ""
Write-Host "==> Reiniciando IIS"
$prev = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
iisreset /noforce | Out-Null
$ErrorActionPreference = $prev

Write-Host ""
Write-Host "==> Verificando porta 80"
Import-Module WebAdministration
Get-Website | ForEach-Object {
    $siteName = $_.Name
    Get-WebBinding -Name $siteName | Where-Object { $_.bindingInformation -match ":80:" } |
        ForEach-Object { "  $($_.bindingInformation) -> $siteName [$((Get-Website -Name $siteName).State)]" }
}

Write-Host ""
Write-Host "Acesse: http://$PublicHost"
