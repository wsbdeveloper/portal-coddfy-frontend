#Requires -RunAsAdministrator
# SSL automatico com Caddy + Lets Encrypt (Docker)
param(
    [string]$Domain = "portal.coddfy.com.br",
    [string]$Email = "admin@coddfy.com"
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$Domain = $Domain.Trim().ToLower() -replace "^https?://", "" -replace "/$", ""
$Caddyfile = Join-Path $RepoRoot "Caddyfile"

function Resolve-DnsAFromServer {
    param([string]$HostName, [string]$DnsServer)
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        $records = Resolve-DnsName -Name $HostName -Type A -Server $DnsServer -DnsOnly
        $a = $records | Where-Object { $_.QueryType -eq "A" -or $_.Type -eq "A" } | Select-Object -First 1
        if ($a.IPAddress) { return $a.IPAddress }
    } finally {
        $ErrorActionPreference = $prev
    }
    return $null
}

function Get-VmPublicIp {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        $ip = Invoke-RestMethod `
            -Uri "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text" `
            -Headers @{ Metadata = "true" } -TimeoutSec 5
        if ($ip) { return $ip.Trim() }
    } finally {
        $ErrorActionPreference = $prev
    }
    return $null
}

Write-Host "================================================================"
Write-Host " SSL Docker (Caddy + Lets Encrypt) - $Domain"
Write-Host "================================================================"

$vmIp = Get-VmPublicIp
$dnsGoogle = Resolve-DnsAFromServer -HostName $Domain -DnsServer "8.8.8.8"
$dnsCloudflare = Resolve-DnsAFromServer -HostName $Domain -DnsServer "1.1.1.1"

Write-Host ""
Write-Host "    VM IP:        $vmIp"
Write-Host "    DNS 8.8.8.8:  $dnsGoogle"
Write-Host "    DNS 1.1.1.1:  $dnsCloudflare"

if ($vmIp -and (($dnsGoogle -ne $vmIp) -or ($dnsCloudflare -ne $vmIp))) {
    throw "DNS ainda nao aponta para esta VM em todos os resolvers. Aguarde propagacao."
}

$backendUp = docker ps -q -f "name=ccm_backend" 2>$null
if (-not $backendUp) {
    throw "Backend nao esta rodando. Rode: cd coddfy && docker compose up -d"
}

Import-Module WebAdministration -ErrorAction SilentlyContinue
foreach ($site in Get-Website) {
    if ($site.State -eq "Started") {
        $on80 = Get-WebBinding -Name $site.Name -ErrorAction SilentlyContinue | Where-Object {
            $_.protocol -eq "http" -and $_.bindingInformation -match ":80:"
        }
        if ($on80) { Stop-Website -Name $site.Name -ErrorAction SilentlyContinue }
    }
}
Stop-Service W3SVC -Force -ErrorAction SilentlyContinue

& (Join-Path $PSScriptRoot "open-firewall.ps1")
@"
{
    email $Email
}

$Domain {
    reverse_proxy ccm_frontend:80
}
"@ | Set-Content -Path $Caddyfile -Encoding UTF8

Write-Host "==> Caddyfile gerado para $Domain"

Push-Location $RepoRoot
try {
    Write-Host "==> Subindo Caddy (443) + frontend interno"
    docker compose -f docker-compose.prod.yml up -d --build

    Write-Host "==> Aguardando certificado (ate 90s)..."
    $deadline = (Get-Date).AddSeconds(90)
    $httpsOk = $false
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri "https://$Domain/api/health" -UseBasicParsing -TimeoutSec 10
            if ($r.StatusCode -eq 200) {
                $httpsOk = $true
                break
            }
        } catch {
            Start-Sleep -Seconds 5
        }
    }

    Write-Host ""
    if ($httpsOk) {
        Write-Host "SSL OK" -ForegroundColor Green
        Write-Host "  https://$Domain"
        Write-Host "  https://$Domain/api/health"
    } else {
        Write-Host "HTTPS ainda nao respondeu. Verifique:" -ForegroundColor Yellow
        Write-Host "  - Porta 443 aberta no NSG Azure"
        Write-Host "  - docker logs ccm_caddy"
        Write-Host "  - Aguarde 5 min e teste: https://$Domain"
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "CORS: confirme https://$Domain no coddfy/docker-compose.yml"
Write-Host "================================================================"
