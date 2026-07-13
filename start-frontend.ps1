# Frontend start script

Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Write-Host "Starting Vite dev server on http://localhost:3000" -ForegroundColor Green
Write-Host ""

Set-Location frontend
npm run dev
