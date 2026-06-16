#Requires -RunAsAdministrator
param(
    [string]$Domain = "portal.coddfy.com.br",

    [switch]$KeepIpBinding
)

$ErrorActionPreference = "Stop"

$SiteName = "CoddfyPortal"
$Domain = $Domain.Trim().ToLower() -replace "^https?://", "" -replace "/$", ""

Write-Host "==> Configurando subdominio: $Domain"
Write-Host "    DNS (LocalWeb): registro A -> IP publico do servidor (20.197.240.231)"

Import-Module WebAdministration

if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
    throw "Site IIS '$SiteName' nao existe. Rode primeiro: .\iis\go-live.ps1"
}

$hostBindings = Get-WebBinding -Name $SiteName | Where-Object {
    $_.protocol -eq "http" -and $_.bindingInformation -match ":80:"
}

$hasDomainBinding = $hostBindings | Where-Object { $_.bindingInformation -eq "*:80:$Domain" }
if (-not $hasDomainBinding) {
    Write-Host "==> Adicionando binding IIS: *:80:$Domain"
    New-WebBinding -Name $SiteName -Protocol "http" -Port 80 -HostHeader $Domain
}

if (-not $KeepIpBinding) {
    $generic = $hostBindings | Where-Object { $_.bindingInformation -eq "*:80:" }
    if ($generic) {
        Write-Host "==> Removendo binding generico *:80: (acesso so pelo subdominio)"
        Remove-WebBinding -Name $SiteName -BindingInformation "*:80:" -Protocol "http"
    }
}

& (Join-Path $PSScriptRoot "go-live.ps1") -PublicHost $Domain

Write-Host ""
Write-Host "==> Bindings do site $SiteName"
Get-WebBinding -Name $SiteName | ForEach-Object { "  $($_.protocol) $($_.bindingInformation)" }

Write-Host ""
Write-Host "================================================================"
Write-Host "Proximo passo — CORS no backend (coddfy/docker-compose.yml):"
Write-Host ""
Write-Host "  CORS_ORIGINS: http://localhost,http://$Domain,http://20.197.240.231"
Write-Host ""
Write-Host "Depois:"
Write-Host "  cd coddfy"
Write-Host "  docker-compose up -d"
Write-Host ""
Write-Host "Acesse: http://$Domain"
Write-Host "API:    http://${Domain}:6543/api"
Write-Host ""
Write-Host "Se a LocalWeb usar HTTPS no subdominio, avise — precisamos"
Write-Host "configurar proxy da API ou certificado para evitar mixed content."
Write-Host "================================================================"
