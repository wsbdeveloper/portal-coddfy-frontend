#Requires -RunAsAdministrator
# Sobe frontend em Docker na porta 80 (nginx + proxy /api -> ccm_backend)
# Requer backend rodando: cd coddfy && docker compose up -d
param(
    [string]$PublicHost = "portal.coddfy.com.br"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$SiteName = "CoddfyPortal"

function Stop-IisOnPort80 {
    Import-Module WebAdministration -ErrorAction SilentlyContinue

    Write-Host "==> Liberando porta 80 (parando sites IIS)"
    foreach ($site in Get-Website) {
        $on80 = Get-WebBinding -Name $site.Name -ErrorAction SilentlyContinue | Where-Object {
            $_.protocol -eq "http" -and $_.bindingInformation -match ":80:"
        }
        if ($on80 -and $site.State -eq "Started") {
            Write-Host "    Parando site: $($site.Name)"
            Stop-Website -Name $site.Name -ErrorAction SilentlyContinue
        }
    }

    $port80 = Get-NetTCPConnection -LocalPort 80 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($port80 -and $port80.OwningProcess) {
        $proc = Get-Process -Id $port80.OwningProcess -ErrorAction SilentlyContinue
        if ($proc -and $proc.ProcessName -eq "System") {
            Write-Host "    Porta 80 ainda em uso pelo http.sys (IIS). Parando W3SVC..."
            Stop-Service W3SVC -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 2
        }
    }
}

Write-Host "================================================================"
Write-Host " Docker go-live - portal na porta 80"
Write-Host "================================================================"

# Backend na rede coddfy_network
$backendUp = docker ps -q -f "name=ccm_backend" 2>$null
if (-not $backendUp) {
    Write-Host "AVISO: ccm_backend nao esta rodando." -ForegroundColor Yellow
    Write-Host "  cd C:\Users\codd_adm\coddfy"
    Write-Host "  docker compose up -d"
    throw "Backend obrigatorio antes do frontend Docker."
}

$networkExists = docker network ls -q -f "name=coddfy_network" 2>$null
if (-not $networkExists) {
    throw "Rede coddfy_network nao existe. Rode docker compose up -d no projeto coddfy."
}

Stop-IisOnPort80

& (Join-Path $PSScriptRoot "open-firewall.ps1")

Push-Location $RepoRoot
try {
    Write-Host ""
    Write-Host "==> Build e subida do frontend (nginx:80 -> ccm_backend:6543)"
    docker compose -f docker-compose.prod.yml up -d --build

    Write-Host ""
    Write-Host "==> Aguardando container"
    Start-Sleep -Seconds 5

    $tests = @(
        "http://127.0.0.1/",
        "http://127.0.0.1/api/health",
        "http://$PublicHost/",
        "http://$PublicHost/api/health"
    )
    foreach ($url in $tests) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 15
            Write-Host "    OK $($r.StatusCode) $url" -ForegroundColor Green
        } catch {
            Write-Host "    FALHA $url -> $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Portal: http://$PublicHost"
Write-Host "Login:  admin / admin123"
Write-Host ""
Write-Host "Azure NSG: porta 80 aberta. Porta 6543 pode ficar fechada (API via /api)."
Write-Host "SSL depois: proxy reverso ou win-acme no nginx (futuro)."
Write-Host "================================================================"
