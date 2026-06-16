#Requires -RunAsAdministrator
param(
    [switch]$ForceRebuild
)

$ErrorActionPreference = "Stop"

$SiteName = "CoddfyPortal"
$SitePath = "C:\inetpub\coddfy-portal"
$Port = 80

$RepoRoot = Split-Path -Parent $PSScriptRoot
$WebConfigSource = Join-Path $RepoRoot "iis\web.config.static"

function Get-ServerIp {
    $ip = Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Select-Object -First 1 -ExpandProperty IPAddress

    if ($ip) { return $ip }
    return "localhost"
}

function Remove-DockerContainer {
    param([string]$Name)

    $prev = $ErrorActionPreference
    $ErrorActionPreference = "SilentlyContinue"
    try {
        $id = docker ps -aq -f "name=$Name"
        if ($id) {
            docker rm -f $Name | Out-Null
            Write-Host "    Container $Name removido"
        }
    } finally {
        $ErrorActionPreference = $prev
    }
}

function Test-IisWebsite {
    param([string]$Name)
    return [bool](Get-Website -Name $Name -ErrorAction SilentlyContinue)
}

function Stop-IisWebsiteSafe {
    param([string]$Name)

    $site = Get-Website -Name $Name -ErrorAction SilentlyContinue
    if ($site -and $site.State -eq "Started") {
        Stop-Website -Name $Name
        Write-Host "    Site '$Name' parado"
    }
}

function Remove-IisHttpBinding {
    param(
        [string]$SiteName,
        [int]$Port = 80
    )

    if (-not (Test-IisWebsite $SiteName)) { return }

    $bindings = Get-WebBinding -Name $SiteName -ErrorAction SilentlyContinue | Where-Object {
        $_.protocol -eq "http" -and $_.bindingInformation -match ":$Port`:"
    }

    foreach ($binding in $bindings) {
        Write-Host "    Removendo $($binding.bindingInformation) de '$SiteName'"
        $prev = $ErrorActionPreference
        $ErrorActionPreference = "SilentlyContinue"
        try {
            Remove-WebBinding -Name $SiteName -BindingInformation $binding.bindingInformation -Protocol $binding.protocol
        } finally {
            $ErrorActionPreference = $prev
        }
    }
}

function Clear-Port80Except {
    param([string]$KeepSiteName)

    foreach ($site in Get-Website) {
        if ($site.Name -eq $KeepSiteName) { continue }
        Stop-IisWebsiteSafe -Name $site.Name
        Remove-IisHttpBinding -SiteName $site.Name -Port 80
    }
}

Write-Host "==> Parando container Docker frontend (se existir)"
Remove-DockerContainer "ccm_frontend"

Write-Host "==> Criando pasta: $SitePath"
New-Item -ItemType Directory -Force -Path $SitePath | Out-Null

$needsBuild = $ForceRebuild -or -not (Test-Path (Join-Path $SitePath "index.html"))
if ($needsBuild) {
    $serverIp = Get-ServerIp
    $apiUrl = "http://${serverIp}:6543/api"
    Write-Host "==> Gerando build estatico (API: $apiUrl)"

    Push-Location $RepoRoot
    try {
        docker build --build-arg VITE_API_URL=$apiUrl -t coddfy-frontend-static .
        Remove-DockerContainer "coddfy_fe_extract"
        docker create --name coddfy_fe_extract coddfy-frontend-static | Out-Null
        Get-ChildItem -Path $SitePath -Force | Remove-Item -Recurse -Force
        docker cp coddfy_fe_extract:/usr/share/nginx/html/. $SitePath
        Remove-DockerContainer "coddfy_fe_extract"
    } finally {
        Pop-Location
    }
}

Write-Host "==> Copiando web.config (SPA, sem proxy ARR)"
Copy-Item -Path $WebConfigSource -Destination (Join-Path $SitePath "web.config") -Force

Import-Module WebAdministration

Write-Host "==> Liberando porta 80 dos outros sites"
Clear-Port80Except -KeepSiteName $SiteName

$site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($site) {
    Write-Host "==> Atualizando site $SiteName"
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $SitePath
} else {
    Write-Host "==> Criando site $SiteName na porta $Port"
    New-Website -Name $SiteName -PhysicalPath $SitePath -Port $Port | Out-Null
}

$coddfyBindings = Get-WebBinding -Name $SiteName -ErrorAction SilentlyContinue | Where-Object {
    $_.protocol -eq "http" -and $_.bindingInformation -match ":$Port`:"
}
if (-not $coddfyBindings) {
    Write-Host "==> Adicionando binding *:80: ao site $SiteName"
    New-WebBinding -Name $SiteName -Protocol "http" -Port $Port -IPAddress "*"
}

if (Test-IisWebsite $SiteName) {
    Start-Website -Name $SiteName
} else {
    throw "Falha ao criar site IIS '$SiteName'"
}

$serverIp = Get-ServerIp
Write-Host ""
Write-Host "OK - Frontend publicado no IIS porta 80"
Write-Host "URL: http://$serverIp"
Write-Host "API: http://${serverIp}:6543/api"
Write-Host ""
Write-Host "CORS no backend (coddfy/docker-compose.yml):"
Write-Host "  CORS_ORIGINS=http://localhost,http://$serverIp"
