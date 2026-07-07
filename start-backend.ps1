# Development Start Scripts

# Backend start script
Write-Host "🚀 Starting Backend Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Activate virtual environment
& ".\venv\Scripts\Activate.ps1"

# Start FastAPI server
Write-Host "Starting FastAPI on http://localhost:8000" -ForegroundColor Green
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host ""

uvicorn backend.main:app --reload --port 8000
