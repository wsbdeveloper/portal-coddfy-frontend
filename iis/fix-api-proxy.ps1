#Requires -RunAsAdministrator
# Corrige 404.4 em /api (IIS tratando API como arquivo estatico)
param(
    [string]$Domain = "portal.coddfy.com.br"
)

$ErrorActionPreference = "Stop"

$SiteName = "CoddfyPortal"
$SitePath = "C:\inetpub\coddfy-portal"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$WebConfigProxy = Join-Path $RepoRoot "iis\web.config.http-proxy"

function Test-IisModule {
    param([string]$Name)
    return [bool](Get-WebGlobalModule -Name $Name -ErrorAction SilentlyContinue)
}

Write-Host "================================================================"
Write-Host " Fix proxy /api -> backend :6543"
Write-Host "================================================================"

Write-Host ""
Write-Host "==> Instalando URL Rewrite + ARR (se necessario)"
& (Join-Path $PSScriptRoot "install-iis-modules.ps1")

Import-Module WebAdministration -ErrorAction SilentlyContinue

$hasRewrite = Test-IisModule "RewriteModule"
$hasArr = Test-IisModule "ApplicationRequestRouting"

Write-Host ""
Write-Host "    RewriteModule: $(if ($hasRewrite) { 'OK' } else { 'AUSENTE' })"
Write-Host "    ARR:           $(if ($hasArr) { 'OK' } else { 'AUSENTE' })"

if (-not $hasRewrite -or -not $hasArr) {
    Write-Host ""
    Write-Host "URL Rewrite ou ARR nao instalados." -ForegroundColor Red
    Write-Host ""
    Write-Host "Opcao rapida (sem instalar modulos):" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File .\iis\go-live-direct.ps1 -PublicHost $Domain"
    Write-Host ""
    Write-Host "Ou instale manualmente no servidor:" -ForegroundColor Yellow
    Write-Host "  1. Baixe e instale URL Rewrite + ARR 3.0"
    Write-Host "  2. Logs em C:\Tools\coddfy-iis\"
    Write-Host "  3. iisreset /noforce"
    Write-Host "  4. Rode este script novamente"
    exit 1
}

Write-Host ""
Write-Host "==> Habilitando proxy ARR no servidor"
Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled" -Value "True"

Write-Host "==> Aplicando web.config.http-proxy"
if (-not (Test-Path $WebConfigProxy)) {
    throw "Arquivo nao encontrado: $WebConfigProxy"
}
Copy-Item $WebConfigProxy (Join-Path $SitePath "web.config") -Force

if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
    throw "Site '$SiteName' nao existe. Rode go-live.ps1 primeiro."
}

Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $SitePath
Start-Website -Name $SiteName

Write-Host "==> Reiniciando IIS"
iisreset /noforce | Out-Null
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "==> Testando proxy"
$tests = @(
    "http://127.0.0.1/api/health",
    "http://localhost/api/health"
)
if ($Domain) {
    $tests += "http://$Domain/api/health"
}

$ok = $false
foreach ($url in $tests) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
        Write-Host "    OK $url -> $($r.StatusCode)" -ForegroundColor Green
        $ok = $true
    } catch {
        Write-Host "    FALHA $url -> $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
if ($ok) {
    Write-Host "Proxy /api funcionando."
    Write-Host "Login: http://$Domain  (admin / admin123)"
} else {
    Write-Host "Ainda falhou. Verifique:" -ForegroundColor Yellow
    Write-Host "  - docker compose up -d (backend na 6543)"
    Write-Host "  - Get-WebGlobalModule | Select Name"
    Write-Host "  - type C:\inetpub\coddfy-portal\web.config"
}
Write-Host "================================================================"
