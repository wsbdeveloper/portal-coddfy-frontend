# Diagnostico do frontend IIS
$SiteName = "CoddfyPortal"
$SitePath = "C:\inetpub\coddfy-portal"
$Domain = "portal.coddfy.com.br"

Write-Host "========== DIAGNOSTICO FRONTEND =========="

Write-Host "`n[1] Arquivos em $SitePath"
if (Test-Path $SitePath) {
    Get-ChildItem $SitePath | Select-Object Name, Length
    if (-not (Test-Path "$SitePath\index.html")) { Write-Host "  ERRO: index.html ausente!" -ForegroundColor Red }
} else {
    Write-Host "  ERRO: pasta nao existe!" -ForegroundColor Red
}

Write-Host "`n[2] Site IIS"
Import-Module WebAdministration -ErrorAction SilentlyContinue
$site = Get-Website -Name $SiteName -ErrorAction SilentlyContinue
if ($site) {
    Write-Host "  Nome: $($site.Name)  Estado: $($site.State)  Path: $($site.PhysicalPath)"
    Get-WebBinding -Name $SiteName | ForEach-Object { Write-Host "  Binding: $($_.protocol) $($_.bindingInformation)" }
} else {
    Write-Host "  ERRO: site $SiteName nao existe!" -ForegroundColor Red
}

Write-Host "`n[3] Modulos IIS"
$rewrite = Get-WebGlobalModule -Name RewriteModule -ErrorAction SilentlyContinue
$arr = Get-WebGlobalModule -Name ApplicationRequestRouting -ErrorAction SilentlyContinue
Write-Host "  URL Rewrite: $(if ($rewrite) { 'OK' } else { 'FALTANDO' })"
Write-Host "  ARR:         $(if ($arr) { 'OK' } else { 'FALTANDO' })"

Write-Host "`n[4] Backend Docker"
docker ps --filter name=ccm_backend --format "  {{.Names}} {{.Status}}"

Write-Host "`n[5] Testes HTTP"
$prev = $ErrorActionPreference
$ErrorActionPreference = "SilentlyContinue"
foreach ($url in @(
    "http://127.0.0.1",
    "http://localhost",
    "http://$Domain",
    "http://127.0.0.1:6543/api/health"
)) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
        Write-Host "  OK $url -> $($r.StatusCode)"
    } catch {
        Write-Host "  FALHOU $url -> $($_.Exception.Message)" -ForegroundColor Yellow
    }
}
$ErrorActionPreference = $prev

Write-Host "`n=========================================="
Write-Host "Reparar: powershell -ExecutionPolicy Bypass -File .\iis\repair-frontend.ps1"
