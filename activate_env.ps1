# ============================================================
# FreelanceHub — Virtual Environment Activator (PowerShell)
# Run this script from the project root:
#   .\activate_env.ps1
# ============================================================

$venvPath = "$PSScriptRoot\backend\venv\Scripts\Activate.ps1"

if (Test-Path $venvPath) {
    Write-Host "✅ Activating virtual environment..." -ForegroundColor Green
    & $venvPath
    Write-Host "🐍 venv active! Python: $(python --version)" -ForegroundColor Cyan
    Write-Host "📁 Working dir set to: backend" -ForegroundColor Yellow
    Set-Location "$PSScriptRoot\backend"
} else {
    Write-Host "❌ Virtual environment not found at: $venvPath" -ForegroundColor Red
    Write-Host "👉 Run this first: python -m venv backend\venv" -ForegroundColor Yellow
}
