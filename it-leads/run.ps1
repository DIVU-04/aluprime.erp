# IT Maps Lead Generator - Windows PowerShell
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "IT Maps Lead Generator - Windows" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env — add GOOGLE_MAPS_API_KEY before searching."
}

$pyExe = $null
foreach ($candidate in @("py -3", "python3", "python")) {
    $name = $candidate.Split(" ")[0]
    if (Get-Command $name -ErrorAction SilentlyContinue) {
        if ($candidate -eq "py -3") {
            $pyExe = "py"
            $pyArgs = @("-3")
        } else {
            $pyExe = $candidate
            $pyArgs = @()
        }
        break
    }
}

if (-not $pyExe) {
    Write-Error "Python not found. Install from https://python.org/downloads/"
}

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..."
    if ($pyArgs.Count) {
        & $pyExe @pyArgs -m venv .venv
    } else {
        & $pyExe -m venv .venv
    }
    & .\.venv\Scripts\python.exe -m pip install --upgrade pip | Out-Null
    & .\.venv\Scripts\pip.exe install -r requirements.txt
}

Write-Host ""
Write-Host "Starting server..."
Write-Host "  Local:   http://localhost:8080"
Write-Host "  Network: http://YOUR-PC-IP:8080  (phone/tablet on same Wi-Fi)"
Write-Host ""

& .\.venv\Scripts\python.exe -m uvicorn server.main:app --host 0.0.0.0 --port 8080 --reload
