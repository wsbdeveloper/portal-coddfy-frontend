#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$SiteName = "Coddfy Portal"
$SitePath = "C:\inetpub\coddfy-portal"
$Port = 80
$DockerUrl = "http://127.0.0.1:8080"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$WebConfigSource = Join-Path $RepoRoot "iis\web.config"

Write-Host "==> Criando pasta do site: $SitePath"
New-Item -ItemType Directory -Force -Path $SitePath | Out-Null

Write-Host "==> Copiando web.config"
if (-not (Test-Path $WebConfigSource)) {
    throw "Arquivo nao encontrado: $WebConfigSource"
}
Copy-Item -Path $WebConfigSource -Destination (Join-Path $SitePath "web.config") -Force

Import-Module WebAdministration

$existingSite = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($existingSite) {
    Write-Host "==> Site '$SiteName' ja existe, atualizando caminho..."
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $SitePath
} else {
    Write-Host "==> Criando site IIS '$SiteName' na porta $Port"
    New-Website -Name $SiteName -PhysicalPath $SitePath -Port $Port | Out-Null
}

Write-Host ""
Write-Host "OK. Proximo passo:"
Write-Host "  1. IIS Manager -> servidor -> Application Request Routing -> Enable proxy"
Write-Host "  2. docker-compose up -d  (frontend na porta 8080)"
Write-Host "  3. Acesse http://localhost"
Write-Host ""
Write-Host "Teste interno do Docker: $DockerUrl"
