# AI-Powered Adaptive Learning Platform - Quick Setup Script

Write-Host "🎓 AI-Powered Adaptive Learning Platform Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check Python
Write-Host "Checking Python installation..." -ForegroundColor Yellow
$pythonVersion = python --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Python found: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Python not found. Please install Python 3.11+" -ForegroundColor Red
    exit 1
}

# Check Node.js
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
$nodeVersion = node --version 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Node.js found: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "✗ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Setting up Backend..." -ForegroundColor Cyan

# Create virtual environment
if (!(Test-Path "venv")) {
    Write-Host "Creating Python virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
}

# Activate virtual environment
Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Install Python dependencies
Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

Write-Host "✓ Backend dependencies installed" -ForegroundColor Green

# Create .env file if not exists
if (!(Test-Path ".env")) {
    Write-Host "Creating .env file from template..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "✓ .env file created (please update with your credentials)" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎨 Setting up Frontend..." -ForegroundColor Cyan

# Install frontend dependencies
Set-Location frontend
Write-Host "Installing Node.js dependencies..." -ForegroundColor Yellow
npm install
Write-Host "✓ Frontend dependencies installed" -ForegroundColor Green

Set-Location ..

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update .env file with your database credentials and API keys"
Write-Host "2. Start PostgreSQL and MongoDB services"
Write-Host "3. Run backend: uvicorn backend.main:app --reload --port 8000"
Write-Host "4. Run frontend: cd frontend && npm run dev"
Write-Host ""
Write-Host "📚 Documentation: Check README.md for detailed instructions"
Write-Host ""
