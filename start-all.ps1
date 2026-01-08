# ChainFreight Local Development Startup Script
# Run both server and optimizer in separate PowerShell windows

Write-Host "Starting ChainFreight Services..." -ForegroundColor Cyan

# Check if Python is installed
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Python is not installed. Please install Python 3.9+" -ForegroundColor Red
    exit 1
}
Write-Host "Python: $pythonVersion" -ForegroundColor Green

# Check if Node is installed
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Node.js is not installed. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}
Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

# Get the script directory
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Optimizer (Python FastAPI) in new window
Write-Host ""
Write-Host "Starting Python Optimizer (port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\optimizer'; if (-not (Test-Path 'venv')) { Write-Host 'Creating venv...' -ForegroundColor Cyan; python -m venv venv }; .\venv\Scripts\Activate.ps1; Write-Host 'Installing deps...' -ForegroundColor Cyan; pip install -r requirements.txt -q; Write-Host ''; Write-Host 'FastAPI Optimizer on http://localhost:8000' -ForegroundColor Green; Write-Host 'Docs: http://localhost:8000/docs' -ForegroundColor Gray; uvicorn app:app --reload --port 8000"

# Wait a bit for optimizer to start
Start-Sleep -Seconds 2

# Start Server (Node.js Express) in new window
Write-Host "Starting Node.js Server (port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\server'; Write-Host 'Installing deps...' -ForegroundColor Cyan; npm install; Write-Host ''; Write-Host 'Express Server on http://localhost:5000' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  ChainFreight Services Starting..." -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  Server:    http://localhost:5000" -ForegroundColor White
Write-Host "  Optimizer: http://localhost:8000" -ForegroundColor White
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
