#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$SiteName = "Coddfy Portal"
$DefaultSiteName = "Default Web Site"
$SitePath = "C:\inetpub\coddfy-portal"
$Port = 80
$DockerUrl = "http://127.0.0.1:8080"

$RepoRoot = Split-Path -Parent $PSScriptRoot
$WebConfigSource = Join-Path $RepoRoot "iis\web.config"

function Test-IisModule {
    param([string]$ModuleName)
    return [bool](Get-WebGlobalModule -Name $ModuleName -ErrorAction SilentlyContinue)
}

Write-Host "==> Verificando modulos IIS"
if (-not (Test-IisModule "RewriteModule")) {
    throw "Modulo URL Rewrite nao instalado. Instale: https://www.iis.net/downloads/microsoft/url-rewrite"
}
if (-not (Test-IisModule "ApplicationRequestRouting")) {
    throw "Modulo ARR nao instalado. Instale: https://www.iis.net/downloads/microsoft/application-request-routing"
}

Write-Host "==> Habilitando proxy no ARR"
Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled" -Value "True"

Write-Host "==> Criando pasta do site: $SitePath"
New-Item -ItemType Directory -Force -Path $SitePath | Out-Null

Write-Host "==> Copiando web.config"
if (-not (Test-Path $WebConfigSource)) {
    throw "Arquivo nao encontrado: $WebConfigSource"
}
Copy-Item -Path $WebConfigSource -Destination (Join-Path $SitePath "web.config") -Force

Import-Module WebAdministration

Write-Host "==> Liberando porta 80 (parando Default Web Site)"
$defaultSite = Get-Website -Name $DefaultSiteName -ErrorAction SilentlyContinue
if ($defaultSite -and $defaultSite.State -eq "Started") {
    Stop-Website -Name $DefaultSiteName
    Write-Host "    Default Web Site parado"
}

Get-Website | ForEach-Object {
    $site = $_
    if ($site.Name -eq $SiteName) { return }

    $bindings = Get-WebBinding -Name $site.Name | Where-Object {
        $_.protocol -eq "http" -and $_.bindingInformation -match ":$Port`:"
    }

    foreach ($binding in $bindings) {
        Write-Host "    Removendo binding $($binding.bindingInformation) do site '$($site.Name)'"
        Remove-WebBinding -Name $site.Name -BindingInformation $binding.bindingInformation -Protocol $binding.protocol
    }
}

$existingSite = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($existingSite) {
    Write-Host "==> Atualizando site '$SiteName'"
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $SitePath
    Set-ItemProperty "IIS:\Sites\$SiteName" -Name serverAutoStart -Value $true
} else {
    Write-Host "==> Criando site '$SiteName' na porta $Port"
    New-Website -Name $SiteName -PhysicalPath $SitePath -Port $Port | Out-Null
}

$coddfyBindings = Get-WebBinding -Name $SiteName | Where-Object {
    $_.protocol -eq "http" -and $_.bindingInformation -match ":$Port`:"
}
if (-not $coddfyBindings) {
    Write-Host "==> Adicionando binding *:80: ao site '$SiteName'"
    New-WebBinding -Name $SiteName -Protocol "http" -Port $Port -IPAddress "*"
}

Write-Host "==> Iniciando site '$SiteName'"
Start-Website -Name $SiteName

Write-Host ""
Write-Host "==> Testando Docker em $DockerUrl"
try {
    $response = Invoke-WebRequest -Uri $DockerUrl -UseBasicParsing -TimeoutSec 5
    Write-Host "    Docker OK (status $($response.StatusCode))"
} catch {
    Write-Warning "    Docker nao respondeu em $DockerUrl"
    Write-Warning "    Rode: cd portal-coddfy-frontend && docker-compose up -d"
}

Write-Host ""
Write-Host "==> Sites na porta 80:"
foreach ($site in Get-Website) {
    $bindings = Get-WebBinding -Name $site.Name | Where-Object { $_.bindingInformation -match ":80:" }
    foreach ($binding in $bindings) {
        Write-Host "    $($binding.protocol) $($binding.bindingInformation) -> $($site.Name)"
    }
}

Write-Host ""
Write-Host "OK. Acesse: http://localhost"
Write-Host "Se ainda aparecer pagina padrao do IIS, reinicie o IIS: iisreset"
