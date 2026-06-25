#Requires -RunAsAdministrator
# Diagnostico tela branca no IIS
param(
    [string]$SitePath = "C:\inetpub\coddfy-portal"
)

$ErrorActionPreference = "Continue"

Write-Host "================================================================"
Write-Host " Diagnostico frontend IIS (tela branca)"
Write-Host "================================================================"

$indexPath = Join-Path $SitePath "index.html"
if (-not (Test-Path $indexPath)) {
    Write-Host "ERRO: index.html ausente em $SitePath" -ForegroundColor Red
    exit 1
}

$index = Get-Content $indexPath -Raw
Write-Host ""
Write-Host "==> index.html"
if ($index -match '/src/main\.tsx') {
    Write-Host "    ERRO: index.html de DESENVOLVIMENTO (aponta para /src/main.tsx)" -ForegroundColor Red
    Write-Host "    Rode go-live-direct.ps1 ou go-live.ps1 com -ForceRebuild"
} elseif ($index -match '/assets/.*\.js') {
    Write-Host "    OK: build de producao (referencia /assets/*.js)" -ForegroundColor Green
    $matches[0] | ForEach-Object { Write-Host "    $_" }
} else {
    Write-Host "    AVISO: nao encontrou script /assets/*.js no index.html" -ForegroundColor Yellow
}

$assetsDir = Join-Path $SitePath "assets"
$jsCount = (Get-ChildItem $assetsDir -Filter "*.js" -ErrorAction SilentlyContinue | Measure-Object).Count
$cssCount = (Get-ChildItem $assetsDir -Filter "*.css" -ErrorAction SilentlyContinue | Measure-Object).Count
Write-Host ""
Write-Host "==> assets/"
Write-Host "    JS:  $jsCount arquivo(s)"
Write-Host "    CSS: $cssCount arquivo(s)"
if ($jsCount -eq 0) {
    Write-Host "    ERRO: pasta assets vazia - rebuild necessario" -ForegroundColor Red
}

$webConfig = Join-Path $SitePath "web.config"
if (Test-Path $webConfig) {
    $wc = Get-Content $webConfig -Raw
    Write-Host ""
    Write-Host "==> web.config"
    if ($wc -match 'error statusCode="404".*index\.html') {
        Write-Host "    AVISO: 404 global -> index.html pode quebrar carregamento de .js" -ForegroundColor Yellow
        Write-Host "    git pull e rode go-live de novo (web.config.static corrigido)"
    }
    if ($wc -match 'API Proxy') {
        Write-Host "    Modo: proxy /api (requer URL Rewrite + ARR)" -ForegroundColor Cyan
    }
}

Write-Host ""
Write-Host "==> Teste HTTP"
$urls = @(
    "http://127.0.0.1/",
    "http://127.0.0.1/assets/"
)
foreach ($base in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $base -UseBasicParsing -TimeoutSec 10
        Write-Host "    $($r.StatusCode) $base"
    } catch {
        Write-Host "    FALHA $base" -ForegroundColor Red
    }
}

if ($index -match 'src="(/assets/[^"]+\.js)"') {
    $jsPath = $Matches[1]
    $jsUrl = "http://127.0.0.1$jsPath"
    try {
        $r = Invoke-WebRequest -Uri $jsUrl -UseBasicParsing -TimeoutSec 10
        $ct = $r.Headers["Content-Type"]
        Write-Host "    $($r.StatusCode) $jsUrl ($ct)"
        if ($ct -like "*html*") {
            Write-Host "    ERRO: JS retornando HTML (IIS servindo index.html no lugar do .js)" -ForegroundColor Red
        }
    } catch {
        Write-Host "    FALHA $jsUrl - asset nao encontrado" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Correcao rapida:"
Write-Host "  powershell -File .\iis\go-live-direct.ps1 -PublicHost portal.coddfy.com.br"
Write-Host ""
Write-Host "Ou migrar para Docker (recomendado se IIS continuar problematico):"
Write-Host "  powershell -File .\iis\docker-go-live.ps1"
Write-Host "================================================================"
