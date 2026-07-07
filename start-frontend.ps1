# Frontend start script

Write-Host "🎨 Starting Frontend Server..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

Set-Location frontend

Write-Host "Starting Vite dev server on http://localhost:3000" -ForegroundColor Green
Write-Host ""

npm run dev
