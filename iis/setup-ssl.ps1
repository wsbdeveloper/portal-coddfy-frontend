#Requires -RunAsAdministrator
param(
    [string]$Domain = "portal.coddfy.com.br",
    [string]$Email = "admin@coddfy.com",
    [switch]$SkipRebuild
)

$ErrorActionPreference = "Stop"

$SiteName = "CoddfyPortal"
$SitePath = "C:\inetpub\coddfy-portal"
$Domain = $Domain.Trim().ToLower() -replace "^https?://", "" -replace "/$", ""
$RepoRoot = Split-Path -Parent $PSScriptRoot
$WacsDir = "C:\Tools\win-acme"
$WacsZip = Join-Path $WacsDir "win-acme.zip"
$WacsExe = Join-Path $WacsDir "wacs.exe"
$WacsFallbackUrl = "https://github.com/win-acme/win-acme/releases/download/v2.2.9.1701/win-acme.v2.2.9.1701.x64.pluggable.zip"

function Enable-Tls12 {
    $protocols = [Net.SecurityProtocolType]::Tls12
    if ([Enum]::IsDefined([Net.SecurityProtocolType], 'Tls13')) {
        $protocols = $protocols -bor [Net.SecurityProtocolType]::Tls13
    }
    [Net.ServicePointManager]::SecurityProtocol = $protocols
}

function Get-WinAcmeDownloadUrl {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        Enable-Tls12
        $release = Invoke-RestMethod `
            -Uri "https://api.github.com/repos/win-acme/win-acme/releases/latest" `
            -Headers @{ "User-Agent" = "coddfy-setup-ssl" } `
            -TimeoutSec 30
        $asset = $release.assets | Where-Object { $_.name -like "win-acme.*.x64.pluggable.zip" } | Select-Object -First 1
        if ($asset.browser_download_url) {
            return $asset.browser_download_url
        }
    } catch {
        Write-Host "    AVISO: nao foi possivel consultar GitHub API - $($_.Exception.Message)" -ForegroundColor Yellow
    } finally {
        $ErrorActionPreference = $prev
    }
    return $WacsFallbackUrl
}

function Install-WinAcme {
    New-Item -ItemType Directory -Force -Path $WacsDir | Out-Null

    $existing = Get-ChildItem -Path $WacsDir -Filter "wacs.exe" -Recurse -ErrorAction SilentlyContinue |
        Select-Object -First 1
    if ($existing) {
        if ([System.IO.Path]::GetFullPath($existing.FullName) -ne [System.IO.Path]::GetFullPath($WacsExe)) {
            Copy-Item $existing.FullName $WacsExe -Force
        }
        return
    }

    $url = Get-WinAcmeDownloadUrl
    Write-Host "    URL: $url"

    Enable-Tls12

    $prev = $ErrorActionPreference
    $ErrorActionPreference = "Stop"
    try {
        Invoke-WebRequest -Uri $url -OutFile $WacsZip -UseBasicParsing `
            -Headers @{ "User-Agent" = "coddfy-setup-ssl" }
    } catch {
        throw @"
Falha ao baixar win-acme: $($_.Exception.Message)

Baixe manualmente no servidor:
  1. Abra no navegador: https://github.com/win-acme/win-acme/releases/latest
  2. Baixe 'win-acme.*.x64.pluggable.zip'
  3. Extraia para C:\Tools\win-acme\
  4. Rode este script de novo com -SkipRebuild
"@
    } finally {
        $ErrorActionPreference = $prev
    }

    Expand-Archive -Path $WacsZip -DestinationPath $WacsDir -Force
    Remove-Item $WacsZip -Force -ErrorAction SilentlyContinue
    $extracted = Get-ChildItem -Path $WacsDir -Filter "wacs.exe" -Recurse | Select-Object -First 1
    if (-not $extracted) {
        throw "wacs.exe nao encontrado apos extrair $WacsZip"
    }
    if ([System.IO.Path]::GetFullPath($extracted.FullName) -ne [System.IO.Path]::GetFullPath($WacsExe)) {
        Copy-Item $extracted.FullName $WacsExe -Force
    }
}

function Get-VmPublicIp {
    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        $ip = Invoke-RestMethod `
            -Uri "http://169.254.169.254/metadata/instance/network/interface/0/ipv4/ipAddress/0/publicIpAddress?api-version=2021-02-01&format=text" `
            -Headers @{ Metadata = "true" } `
            -TimeoutSec 5
        if ($ip) { return $ip.Trim() }
    } finally {
        $ErrorActionPreference = $prev
    }
    return $null
}

function Test-DomainPointsToVm {
    param([string]$HostName, [string]$ExpectedIp)

    $resolved = [System.Net.Dns]::GetHostAddresses($HostName) |
        Where-Object { $_.AddressFamily -eq "InterNetwork" } |
        Select-Object -First 1

    if (-not $resolved) { return $false }
    return ($resolved.IPAddressToString -eq $ExpectedIp)
}

function Test-HttpResponse {
    param([string]$Url)

    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10 -MaximumRedirection 0
        return @{ Ok = $true; Status = $r.StatusCode; Server = $r.Headers["Server"] }
    } catch {
        if ($_.Exception.Response) {
            return @{
                Ok = $false
                Status = [int]$_.Exception.Response.StatusCode
                Server = $_.Exception.Response.Headers["Server"]
            }
        }
        return @{ Ok = $false; Status = 0; Server = $_.Exception.Message }
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Stop-IisWebsiteSafe {
    param([string]$Name)

    $site = Get-Website -Name $Name -ErrorAction SilentlyContinue
    if (-not $site -or $site.State -ne "Started") { return }

    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        Stop-Website -Name $Name
        Write-Host "    Site parado: $Name"
    } catch {
        Write-Host "    AVISO: nao foi possivel parar '$Name'" -ForegroundColor Yellow
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Clear-StaleBindings {
    param([string]$SiteName, [string]$KeepDomain)

    Import-Module WebAdministration -ErrorAction SilentlyContinue

    foreach ($site in Get-Website) {
        if ($site.Name -eq $SiteName) { continue }
        Stop-IisWebsiteSafe -Name $site.Name
    }

    Get-WebBinding -Name $SiteName -ErrorAction SilentlyContinue | ForEach-Object {
        $binding = $_
        if ($binding.protocol -ne "http" -or $binding.bindingInformation -notmatch ":80:") { return }
        $hostHeader = ($binding.bindingInformation -split ":", 3)[2]
        if ($hostHeader -and $hostHeader -ne $KeepDomain) {
            Write-Host "    Removendo binding antigo: $($binding.bindingInformation)"
            Remove-WebBinding -Name $SiteName -BindingInformation $binding.bindingInformation -Protocol $binding.protocol
        }
    }
}

Write-Host "================================================================"
Write-Host " SSL HTTPS - $Domain"
Write-Host "================================================================"

$vmIp = Get-VmPublicIp
if ($vmIp) {
    Write-Host ""
    Write-Host "==> IP publico desta VM: $vmIp"
    $dnsOk = Test-DomainPointsToVm -HostName $Domain -ExpectedIp $vmIp
    if ($dnsOk) {
        Write-Host "    DNS OK: $Domain aponta para esta VM"
    } else {
        $resolved = ([System.Net.Dns]::GetHostAddresses($Domain) | Select-Object -First 1).IPAddressToString
        Write-Host "    AVISO: $Domain resolve para $resolved (esperado: $vmIp)" -ForegroundColor Yellow
        Write-Host "    Ajuste o DNS na LocalWeb ANTES do SSL (registro A direto na VM)." -ForegroundColor Yellow
        Write-Host "    Se o dominio passar pelo proxy LocalWeb, o Let's Encrypt vai falhar." -ForegroundColor Yellow
    }
}

$domainTest = Test-HttpResponse -Url "http://$Domain/"
Write-Host ""
Write-Host "==> Teste HTTP externo: http://$Domain/ -> $($domainTest.Status) ($($domainTest.Server))"
if ($domainTest.Server -like "*nginx*") {
    Write-Host "    ERRO: dominio ainda passa pelo nginx da LocalWeb (302/proxy)." -ForegroundColor Red
    Write-Host "    Corrija o DNS/proxy na LocalWeb e rode este script de novo." -ForegroundColor Red
    throw "DNS/proxy LocalWeb bloqueia emissao do certificado."
}

& (Join-Path $PSScriptRoot "install-iis-modules.ps1")
& (Join-Path $PSScriptRoot "open-firewall.ps1")

Write-Host ""
if (-not $SkipRebuild) {
    Write-Host '==> Publicando frontend com API em /api'
    & (Join-Path $PSScriptRoot "setup-iis-static.ps1") -ForceRebuild -PublicHost $Domain -ApiUrl "/api"
} else {
    Write-Host "==> Pulando rebuild (-SkipRebuild)"
}

Copy-Item (Join-Path $RepoRoot "iis\web.config.http-proxy") (Join-Path $SitePath "web.config") -Force

Import-Module WebAdministration

if (-not (Get-Website -Name $SiteName -ErrorAction SilentlyContinue)) {
    throw "Site '$SiteName' nao encontrado. Rode repair-frontend.ps1 primeiro."
}

Clear-StaleBindings -SiteName $SiteName -KeepDomain $Domain

$httpBindings = Get-WebBinding -Name $SiteName | Where-Object {
    $_.protocol -eq "http" -and $_.bindingInformation -match ":80:"
}
if (-not ($httpBindings | Where-Object { $_.bindingInformation -eq "*:80:$Domain" })) {
    Write-Host "==> Binding HTTP: *:80:$Domain"
    New-WebBinding -Name $SiteName -Protocol "http" -Port 80 -HostHeader $Domain
}
if (-not ($httpBindings | Where-Object { $_.bindingInformation -eq "*:80:" })) {
    New-WebBinding -Name $SiteName -Protocol "http" -Port 80 -IPAddress "*"
}

Start-Website -Name $SiteName

Write-Host ""
Write-Host '==> Baixando win-acme (Lets Encrypt)'
Install-WinAcme

$siteId = (Get-Website -Name $SiteName).Id

Write-Host ""
Write-Host '==> Emitindo certificado SSL (Lets Encrypt via win-acme)'

$wacsCommon = @(
    "--store", "certificatestore",
    "--installation", "iis",
    "--installationsiteid", $siteId,
    "--sslport", "443",
    "--emailaddress", $Email,
    "--accepttos",
    "--verbose"
)

$wacsOk = $false
$prev = $ErrorActionPreference
$ErrorActionPreference = "Continue"

# Tentativa 1: validacao HTTP-01 via pasta do site (IIS na porta 80)
Write-Host "    [1/2] Validacao filesystem em $SitePath ..."
& $WacsExe --source manual --host $Domain --validation filesystem --webroot $SitePath @wacsCommon
if ($LASTEXITCODE -eq 0) { $wacsOk = $true }

# Tentativa 2: plugin IIS + selfhosting
if (-not $wacsOk) {
    Write-Host "    [2/2] Validacao via plugin IIS ..."
    & $WacsExe --source iis --siteid $siteId --host $Domain --validation selfhosting @wacsCommon
    if ($LASTEXITCODE -eq 0) { $wacsOk = $true }
}

$ErrorActionPreference = $prev

if ($wacsOk) {
    Write-Host "==> Certificado OK - ativando HTTPS + redirect"
    Copy-Item (Join-Path $RepoRoot "iis\web.config.https") (Join-Path $SitePath "web.config") -Force
} else {
    Write-Host "AVISO: win-acme falhou. Rode manualmente:" -ForegroundColor Yellow
    Write-Host "  cd C:\Tools\win-acme"
    Write-Host "  .\wacs.exe"
    Write-Host "  Escolha: criar certificado -> IIS -> site CoddfyPortal -> $Domain"
}

iisreset /noforce | Out-Null

Write-Host ""
Write-Host "================================================================"
Write-Host "Teste:"
Write-Host "  https://$Domain"
Write-Host "  https://$Domain/api/health"
Write-Host ""
Write-Host "Backend (se ainda nao fez):"
Write-Host "  cd coddfy && git pull && docker-compose up -d"
Write-Host "  CORS_ORIGINS ja inclui https://$Domain"
Write-Host "================================================================"
