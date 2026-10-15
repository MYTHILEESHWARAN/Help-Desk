# HelpDesk 360 - Local dev start script
# Runs DB in Docker, backend and frontend as separate processes
# Usage: .\dev-start.ps1

Write-Host "`n=== HelpDesk 360 Dev Start ===" -ForegroundColor Cyan

# 1. Start only the DB container
Write-Host "`n[1/4] Starting Postgres..." -ForegroundColor Yellow
docker compose up db -d
Start-Sleep -Seconds 5

# 2. Run migrations + seed (only if needed)
Write-Host "`n[2/4] Running migrations and seed..." -ForegroundColor Yellow
Set-Location backend
npx prisma migrate deploy
npx ts-node prisma/seed.ts
Set-Location ..

Write-Host "`n[3/4] Starting backend on http://localhost:4000 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\user\OneDrive\Desktop\Help Desk\backend'; npm run dev" -WindowStyle Normal

Start-Sleep -Seconds 3

Write-Host "`n[4/4] Starting frontend on http://localhost:5173 ..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'c:\Users\user\OneDrive\Desktop\Help Desk\frontend'; npm run dev" -WindowStyle Normal

Write-Host "`n? Done! Open http://localhost:5173 in your browser." -ForegroundColor Green
Write-Host "   Demo accounts: arjun.mehta / kavya.reddy (technician), priya.nair (employee)" -ForegroundColor Gray
Write-Host "   Password: Demo1234!" -ForegroundColor Gray
