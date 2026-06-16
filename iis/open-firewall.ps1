#Requires -RunAsAdministrator
$ErrorActionPreference = "Stop"

function Add-FirewallRuleIfMissing {
    param(
        [string]$Name,
        [int]$Port
    )

    $existing = Get-NetFirewallRule -DisplayName $Name -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  Regra ja existe: $Name"
        return
    }

    New-NetFirewallRule `
        -DisplayName $Name `
        -Direction Inbound `
        -Protocol TCP `
        -LocalPort $Port `
        -Action Allow | Out-Null

    Write-Host "  Regra criada: $Name (porta $Port)"
}

Write-Host "==> Abrindo portas no Windows Firewall"
Add-FirewallRuleIfMissing -Name "Coddfy HTTP 80" -Port 80
Add-FirewallRuleIfMissing -Name "Coddfy API 6543" -Port 6543

Write-Host ""
Write-Host "OK. Tambem libere as portas 80 e 6543 no NSG do Azure (Inbound security rules)."
