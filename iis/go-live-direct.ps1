#Requires -RunAsAdministrator
# Deploy HTTP sem ARR/URL Rewrite - API exposta na porta 6543
param(
    [string]$PublicHost = "portal.coddfy.com.br"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================================"
Write-Host " Go-live HTTP direto (sem proxy /api no IIS)"
Write-Host "================================================================"
Write-Host ""
Write-Host "Usa quando URL Rewrite + ARR nao estao instalados."
Write-Host "  Portal: http://$PublicHost"
Write-Host "  API:    http://${PublicHost}:6543/api"
Write-Host ""
Write-Host "Abra a porta 6543 no NSG do Azure." -ForegroundColor Yellow
Write-Host ""

& (Join-Path $PSScriptRoot "open-firewall.ps1")
& (Join-Path $PSScriptRoot "setup-iis-static.ps1") -ForceRebuild -PublicHost $PublicHost

$prev = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
iisreset /noforce | Out-Null
$ErrorActionPreference = $prev

Write-Host ""
Write-Host "Teste:"
Write-Host "  Invoke-WebRequest http://$PublicHost -UseBasicParsing"
Write-Host "  Invoke-WebRequest http://${PublicHost}:6543/api/health -UseBasicParsing"
Write-Host "================================================================"
