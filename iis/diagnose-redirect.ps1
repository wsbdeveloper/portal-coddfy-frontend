# Diagnostico: quem responde na porta 80 e redirects
$Domain = "portal.coddfy.com.br"
$Ip = "20.197.240.231"

Write-Host "========== QUEM RESPONDE NA PORTA 80? =========="

Write-Host "`n[1] Processos na porta 80 (Windows)"
netstat -ano | findstr ":80 "

Write-Host "`n[2] Sites IIS"
Import-Module WebAdministration -ErrorAction SilentlyContinue
Get-Website | Format-Table Name, State, PhysicalPath -AutoSize
Get-WebBinding | Where-Object { $_.bindingInformation -match ":80:" } | ForEach-Object {
    $siteName = (Get-Website | Where-Object { $_.Id -eq ($_.ItemXPath -replace '.*@name=''([^'']+)''.*','$1') } 2>$null)
    Write-Host "  IIS binding: $($_.protocol) $($_.bindingInformation)"
}

Write-Host "`n[3] Containers Docker"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

Write-Host "`n[4] Teste LOCAL direto no IIS (deve ser Microsoft-IIS)"
curl.exe -sI http://127.0.0.1/ | findstr /I "HTTP Server Location"

Write-Host "`n[5] Teste LOCAL com Host do dominio"
curl.exe -sI -H "Host: $Domain" http://127.0.0.1/ | findstr /I "HTTP Server Location"

Write-Host "`n[6] Teste pelo IP publico"
curl.exe -sI http://$Ip/ | findstr /I "HTTP Server Location"

Write-Host "`n[7] Teste pelo dominio (pode passar pela LocalWeb)"
curl.exe -sI http://$Domain/ | findstr /I "HTTP Server Location"

Write-Host "`n========== INTERPRETACAO =========="
Write-Host "- Se [4] mostra Microsoft-IIS mas [7] mostra nginx:"
Write-Host "  -> O redirect vem da LOCALWEB (proxy na frente da VM), nao da VM."
Write-Host "- Se [4] ja mostra nginx:"
Write-Host "  -> nginx esta na VM (Docker ou outro servico). Pare containers na porta 80."
Write-Host ""
Write-Host "Nosso deploy usa IIS, NAO nginx 1.14.2 na VM."
Write-Host "Reparar IIS: .\iis\repair-frontend.ps1"
