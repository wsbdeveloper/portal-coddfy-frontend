#Requires -RunAsAdministrator
param(
    [switch]$ForceRebuild
)

$ErrorActionPreference = "Stop"

$SiteName = "CoddfyPortal"
$DefaultSiteName = "Default Web Site"
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

Write-Host "==> Parando Default Web Site e liberando porta 80"
Stop-Website -Name $DefaultSiteName -ErrorAction SilentlyContinue
Remove-WebBinding -Name $DefaultSiteName -BindingInformation "*:80:" -Protocol "http" -ErrorAction SilentlyContinue

Get-Website | ForEach-Object {
    $otherSite = $_.Name
    if ($otherSite -eq $SiteName) { return }
    Get-WebBinding -Name $otherSite | Where-Object {
        $_.protocol -eq "http" -and $_.bindingInformation -match ":$Port`:"
    } | ForEach-Object {
        Write-Host "    Removendo $($_.bindingInformation) de '$otherSite'"
        Remove-WebBinding -Name $otherSite -BindingInformation $_.bindingInformation -Protocol $_.protocol
    }
}

$site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($site) {
    Write-Host "==> Atualizando site $SiteName"
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $SitePath
} else {
    Write-Host "==> Criando site $SiteName na porta $Port"
    New-Website -Name $SiteName -PhysicalPath $SitePath -Port $Port | Out-Null
}

Start-Website -Name $SiteName

$serverIp = Get-ServerIp
Write-Host ""
Write-Host "OK - Frontend publicado no IIS porta 80"
Write-Host "URL: http://$serverIp"
Write-Host "API: http://${serverIp}:6543/api"
Write-Host ""
Write-Host "CORS no backend (coddfy/docker-compose.yml):"
Write-Host "  CORS_ORIGINS=http://localhost,http://$serverIp"
