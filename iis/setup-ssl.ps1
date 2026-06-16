#Requires -RunAsAdministrator
param(
    [string]$Domain = "portal.coddfy.com.br",

    [string]$Email = "admin@coddfy.com"
)

$ErrorActionPreference = "Stop"

$SiteName = "CoddfyPortal"
$SitePath = "C:\inetpub\coddfy-portal"
$Domain = $Domain.Trim().ToLower() -replace "^https?://", "" -replace "/$", ""
$RepoRoot = Split-Path -Parent $PSScriptRoot
$WacsDir = "C:\Tools\win-acme"
$WacsZip = Join-Path $WacsDir "win-acme.zip"
$WacsExe = Join-Path $WacsDir "wacs.exe"
$WacsUrl = "https://github.com/win-acme/win-acme/releases/download/v2.2.9.5/win-acme.v2.2.9.5.x64.pluggable.zip"

Write-Host "================================================================"
Write-Host " SSL HTTPS — $Domain"
Write-Host "================================================================"

& (Join-Path $PSScriptRoot "install-iis-modules.ps1")
& (Join-Path $PSScriptRoot "open-firewall.ps1")

Write-Host ""
Write-Host '==> Publicando frontend com API em /api - mesmo dominio, sem mixed content'
& (Join-Path $PSScriptRoot "setup-iis-static.ps1") -ForceRebuild -PublicHost $Domain -ApiUrl "/api"

# Troca web.config para proxy HTTP (sem redirect HTTPS ate certificado existir)
Copy-Item (Join-Path $RepoRoot "iis\web.config.http-proxy") (Join-Path $SitePath "web.config") -Force

Import-Module WebAdministration

if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
    throw "Site '$SiteName' nao encontrado. Rode go-live.ps1 ou setup-domain.ps1 primeiro."
}

# Binding HTTP para validacao Let's Encrypt e redirect
$httpBindings = Get-WebBinding -Name $SiteName | Where-Object {
    $_.protocol -eq "http" -and $_.bindingInformation -match ":80:"
}
if (-not ($httpBindings | Where-Object { $_.bindingInformation -eq "*:80:$Domain" })) {
    Write-Host "==> Binding HTTP para $Domain"
    New-WebBinding -Name $SiteName -Protocol "http" -Port 80 -HostHeader $Domain
}

Write-Host ""
Write-Host '==> Baixando win-acme (Lets Encrypt)'
New-Item -ItemType Directory -Force -Path $WacsDir | Out-Null
if (-not (Test-Path $WacsExe)) {
    Invoke-WebRequest -Uri $WacsUrl -OutFile $WacsZip -UseBasicParsing
    Expand-Archive -Path $WacsZip -DestinationPath $WacsDir -Force
    $extracted = Get-ChildItem -Path $WacsDir -Filter "wacs.exe" -Recurse | Select-Object -First 1
    if ($extracted -and $extracted.FullName -ne $WacsExe) {
        Copy-Item $extracted.FullName $WacsExe -Force
    }
}

$site = Get-Website -Name $SiteName
$siteId = $site.Id

Write-Host ""
Write-Host '==> Emitindo certificado SSL (Lets Encrypt)'
Write-Host "    Isso pode abrir uma janela ou pedir confirmacao..."

$wacsOk = $false
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"
try {
    & $WacsExe `
        --target iis `
        --siteid $siteId `
        --host $Domain `
        --installation iis `
        --installationsiteid $siteId `
        --emailaddress $Email `
        --accepttos `
        --verbose
    if ($LASTEXITCODE -eq 0) { $wacsOk = $true }
} finally {
    $ErrorActionPreference = $prev
}

if ($wacsOk) {
    Write-Host "==> Certificado OK - ativando redirect HTTPS"
    Copy-Item (Join-Path $RepoRoot "iis\web.config.https") (Join-Path $SitePath "web.config") -Force
} else {
    Write-Host "AVISO: win-acme falhou. Frontend continua em HTTP com proxy /api" -ForegroundColor Yellow
    Write-Host "       Rode manualmente: C:\Tools\win-acme\wacs.exe"
}

Write-Host ""
Write-Host "==> Reiniciando IIS"
iisreset /noforce | Out-Null

Write-Host ""
Write-Host "================================================================"
Write-Host "OK — acesse: https://$Domain"
Write-Host ""
Write-Host "CORS no backend (coddfy/docker-compose.yml):"
Write-Host "  CORS_ORIGINS: https://$Domain,http://$Domain"
Write-Host ""
Write-Host "Depois: cd coddfy && docker-compose up -d"
Write-Host ""
Write-Host "Renovacao automatica: win-acme cria tarefa agendada no Windows."
Write-Host "================================================================"
