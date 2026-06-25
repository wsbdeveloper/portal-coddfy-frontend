#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$ToolsDir = "C:\Tools\coddfy-iis"
$RewriteMsi = Join-Path $ToolsDir "rewrite_amd64.msi"
$ArrMsi = Join-Path $ToolsDir "requestRouter_amd64.msi"
$RewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
$ArrUrl = "https://download.microsoft.com/fwlink/?LinkID=615136"

function Test-IisModule {
    param([string]$ModuleName)
    return [bool](Get-WebGlobalModule -Name $ModuleName -ErrorAction SilentlyContinue)
}

New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null

if (-not (Test-IisModule "RewriteModule")) {
    Write-Host "==> Instalando URL Rewrite..."
    Invoke-WebRequest -Uri $RewriteUrl -OutFile $RewriteMsi -UseBasicParsing
    Start-Process msiexec.exe -ArgumentList "/i `"$RewriteMsi`" /qn /norestart" -Wait
} else {
    Write-Host "==> URL Rewrite ja instalado"
}

if (-not (Test-IisModule "ApplicationRequestRouting")) {
    Write-Host "==> Instalando Application Request Routing (ARR)..."
    Invoke-WebRequest -Uri $ArrUrl -OutFile $ArrMsi -UseBasicParsing
    Start-Process msiexec.exe -ArgumentList "/i `"$ArrMsi`" /qn /norestart" -Wait
} else {
    Write-Host "==> ARR ja instalado"
}

$needsReset = $false
if (-not (Test-IisModule "RewriteModule")) { $needsReset = $true }
if (-not (Test-IisModule "ApplicationRequestRouting")) { $needsReset = $true }

Import-Module WebAdministration -ErrorAction SilentlyContinue
if (Test-IisModule "ApplicationRequestRouting") {
    Write-Host "==> Habilitando proxy no ARR"
    Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
}

if ($needsReset) {
    Write-Host "==> Reiniciando IIS (primeira instalacao dos modulos)"
    iisreset /noforce | Out-Null
}

Write-Host ""
Write-Host "OK. Modulos IIS prontos."
