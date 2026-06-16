#Requires -RunAsAdministrator
param(
    [string]$Domain = "portal.coddfy.com.br"
)

$ErrorActionPreference = "Stop"

$SiteName = "CoddfyPortal"
$SitePath = "C:\inetpub\coddfy-portal"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Domain = $Domain.Trim().ToLower() -replace "^https?://", "" -replace "/$", ""

function Test-IisModule {
    param([string]$Name)
    return [bool](Get-WebGlobalModule -Name $Name -ErrorAction SilentlyContinue)
}

function Test-SslBinding {
    param([string]$SiteName, [string]$HostName)
    $bindings = Get-WebBinding -Name $SiteName -ErrorAction SilentlyContinue | Where-Object {
        $_.protocol -eq "https" -and $_.bindingInformation -match ":443:"
    }
    if ($HostName) {
        return [bool]($bindings | Where-Object { $_.bindingInformation -like "*:$HostName" -or $_.bindingInformation -eq "*:443:" })
    }
    return [bool]$bindings
}

Write-Host "==> Reparando frontend IIS"

# 1. Build se faltar arquivos
if (-not (Test-Path "$SitePath\index.html")) {
    Write-Host "==> index.html ausente - gerando build"
    & (Join-Path $PSScriptRoot "setup-iis-static.ps1") -ForceRebuild -PublicHost $Domain -ApiUrl "/api"
}

$hasRewrite = Test-IisModule "RewriteModule"
$hasArr = Test-IisModule "ApplicationRequestRouting"
$hasSsl = $false

Import-Module WebAdministration -ErrorAction SilentlyContinue
if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    $hasSsl = Test-SslBinding -SiteName $SiteName -HostName $Domain
}

# 2. web.config adequado
if ($hasRewrite -and $hasArr) {
    if ($hasSsl) {
        Write-Host "==> SSL detectado - web.config.https"
        Copy-Item (Join-Path $RepoRoot "iis\web.config.https") "$SitePath\web.config" -Force
    } else {
        Write-Host "==> Sem SSL ainda - web.config.http-proxy (sem redirect HTTPS)"
        Copy-Item (Join-Path $RepoRoot "iis\web.config.http-proxy") "$SitePath\web.config" -Force
    }
    if ($hasArr) {
        Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled" -Value "True" -ErrorAction SilentlyContinue
    }
} else {
    Write-Host "==> ARR/Rewrite ausente - web.config.static (HTTP simples)"
    Write-Host "    Rode: .\iis\install-iis-modules.ps1"
    Copy-Item (Join-Path $RepoRoot "iis\web.config.static") "$SitePath\web.config" -Force
}

# 3. Garantir site e bindings
New-Item -ItemType Directory -Force -Path $SitePath | Out-Null

if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
    Write-Host "==> Criando site $SiteName"
    New-Website -Name $SiteName -PhysicalPath $SitePath -Port 80 | Out-Null
} else {
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $SitePath
}

$bindings = Get-WebBinding -Name $SiteName -ErrorAction SilentlyContinue
if (-not ($bindings | Where-Object { $_.bindingInformation -eq "*:80:" })) {
    New-WebBinding -Name $SiteName -Protocol http -Port 80 -IPAddress "*"
}
if (-not ($bindings | Where-Object { $_.bindingInformation -eq "*:80:$Domain" })) {
    New-WebBinding -Name $SiteName -Protocol http -Port 80 -HostHeader $Domain
}

Start-Website -Name $SiteName

Write-Host "==> Reiniciando IIS"
iisreset /noforce | Out-Null

Write-Host ""
Write-Host "OK. Teste:"
Write-Host "  http://$Domain"
Write-Host "  http://127.0.0.1"
if (-not $hasSsl) {
    Write-Host ""
    Write-Host "SSL ainda nao configurado. Depois rode:"
    Write-Host "  .\iis\setup-ssl.ps1 -Domain $Domain"
}
