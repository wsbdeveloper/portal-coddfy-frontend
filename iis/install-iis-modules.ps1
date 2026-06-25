#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

$ToolsDir = "C:\Tools\coddfy-iis"
$RewriteMsi = Join-Path $ToolsDir "rewrite_amd64.msi"
$ArrMsi = Join-Path $ToolsDir "requestRouter_amd64.msi"
$RewriteUrl = "https://download.microsoft.com/download/1/2/8/128E2E22-C1B9-44A4-BE2A-5859ED1D4592/rewrite_amd64_en-US.msi"
$ArrUrl = "https://download.microsoft.com/fwlink/?LinkID=615136"

function Enable-Tls12 {
    $protocols = [Net.SecurityProtocolType]::Tls12
    if ([Enum]::IsDefined([Net.SecurityProtocolType], 'Tls13')) {
        $protocols = $protocols -bor [Net.SecurityProtocolType]::Tls13
    }
    [Net.ServicePointManager]::SecurityProtocol = $protocols
}

function Test-IisModule {
    param([string]$ModuleName)
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    return [bool](Get-WebGlobalModule -Name $ModuleName -ErrorAction SilentlyContinue)
}

function Get-FileIfMissing {
    param(
        [string]$Url,
        [string]$OutFile,
        [string]$Label
    )

    if ((Test-Path $OutFile) -and ((Get-Item $OutFile).Length -gt 100000)) {
        Write-Host "    MSI ja existe: $OutFile"
        return
    }

    Write-Host "    Baixando $Label..."
    Enable-Tls12
    Invoke-WebRequest -Uri $Url -OutFile $OutFile -UseBasicParsing -Headers @{ "User-Agent" = "coddfy-iis-setup" }

    if (-not (Test-Path $OutFile) -or (Get-Item $OutFile).Length -lt 100000) {
        throw "Download falhou ou arquivo muito pequeno: $OutFile"
    }
}

function Install-MsiPackage {
    param(
        [string]$MsiPath,
        [string]$LogPath
    )

    $args = "/i `"$MsiPath`" /qn /norestart /l*v `"$LogPath`""
    Write-Host "    msiexec $args"
    $proc = Start-Process msiexec.exe -ArgumentList $args -Wait -PassThru -NoNewWindow
    Write-Host "    Exit code: $($proc.ExitCode) (0=OK, 3010=reboot recomendado)"
    return $proc.ExitCode
}

function Try-ChocolateyInstall {
    $choco = Get-Command choco -ErrorAction SilentlyContinue
    if (-not $choco) { return $false }

    Write-Host "==> Tentando instalar via Chocolatey"
    & choco install urlrewrite -y --no-progress
    & choco install iis-arr -y --no-progress
    return $true
}

New-Item -ItemType Directory -Force -Path $ToolsDir | Out-Null

$installedSomething = $false

if (-not (Test-IisModule "RewriteModule")) {
    Write-Host "==> Instalando URL Rewrite"
    try {
        Get-FileIfMissing -Url $RewriteUrl -OutFile $RewriteMsi -Label "URL Rewrite"
        $code = Install-MsiPackage -MsiPath $RewriteMsi -LogPath (Join-Path $ToolsDir "rewrite-install.log")
        if ($code -eq 0 -or $code -eq 3010) { $installedSomething = $true }
    } catch {
        Write-Host "    AVISO: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "==> URL Rewrite ja instalado"
}

if (-not (Test-IisModule "ApplicationRequestRouting")) {
    Write-Host "==> Instalando ARR 3.0"
    try {
        Get-FileIfMissing -Url $ArrUrl -OutFile $ArrMsi -Label "ARR"
        $code = Install-MsiPackage -MsiPath $ArrMsi -LogPath (Join-Path $ToolsDir "arr-install.log")
        if ($code -eq 0 -or $code -eq 3010) { $installedSomething = $true }
    } catch {
        Write-Host "    AVISO: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "==> ARR ja instalado"
}

if (-not (Test-IisModule "RewriteModule") -or -not (Test-IisModule "ApplicationRequestRouting")) {
    Try-ChocolateyInstall | Out-Null
}

if ($installedSomething -or -not (Test-IisModule "RewriteModule") -or -not (Test-IisModule "ApplicationRequestRouting")) {
    Write-Host "==> Reiniciando IIS"
    iisreset /noforce | Out-Null
    Start-Sleep -Seconds 3
}

$hasRewrite = Test-IisModule "RewriteModule"
$hasArr = Test-IisModule "ApplicationRequestRouting"

Import-Module WebAdministration -ErrorAction SilentlyContinue
if ($hasArr) {
    Write-Host "==> Habilitando proxy no ARR"
    Set-WebConfigurationProperty -PSPath "MACHINE/WEBROOT/APPHOST" -Filter "system.webServer/proxy" -Name "enabled" -Value "True"
}

Write-Host ""
Write-Host "URL Rewrite: $(if ($hasRewrite) { 'OK' } else { 'FALHOU' })"
Write-Host "ARR:         $(if ($hasArr) { 'OK' } else { 'FALHOU' })"

if (-not $hasRewrite -or -not $hasArr) {
    Write-Host ""
    Write-Host "Instalacao automatica falhou. Opcoes:" -ForegroundColor Yellow
    Write-Host "  A) Baixe no navegador DO SERVIDOR e instale os MSI:" -ForegroundColor Yellow
    Write-Host "     $RewriteUrl" -ForegroundColor Yellow
    Write-Host "     $ArrUrl" -ForegroundColor Yellow
    Write-Host "     Salve em $ToolsDir e rode este script de novo." -ForegroundColor Yellow
    Write-Host "  B) Logs: $ToolsDir\rewrite-install.log e arr-install.log" -ForegroundColor Yellow
    Write-Host "  C) Sem ARR (entrega rapida): .\iis\go-live-direct.ps1" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "OK. Modulos IIS prontos."
