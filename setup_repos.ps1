# Helper script to initialize and push the three sub-folders as separate GitHub Repositories.
# Note: You will need to create the repositories on GitHub first!

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "     Hirely Repository Splitting Helper" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

$github_username = Read-Host "Enter your GitHub username (e.g. kashyap24404)"
if ([string]::IsNullOrWhiteSpace($github_username)) {
    Write-Host "Username cannot be empty. Exiting." -ForegroundColor Red
    Exit
}

# 1. Frontend
Write-Host "`nInitializing Recruiter Frontend Repository..." -ForegroundColor Yellow
cd "$PSScriptRoot\frontend"
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
git init
git add .
git commit -m "initial commit: Hirely Recruiter Frontend"
git branch -M main
git remote add origin "https://github.com/$github_username/hirely-frontend.git"
Write-Host "Local frontend repo initialized and linked to: https://github.com/$github_username/hirely-frontend.git" -ForegroundColor Green

# 2. Backend
Write-Host "`nInitializing Backend Worker Repository..." -ForegroundColor Yellow
cd "$PSScriptRoot\backend"
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
git init
git add .
git commit -m "initial commit: Hirely Backend Worker API"
git branch -M main
git remote add origin "https://github.com/$github_username/hirely-backend.git"
Write-Host "Local backend repo initialized and linked to: https://github.com/$github_username/hirely-backend.git" -ForegroundColor Green

# 3. Admin Frontend
Write-Host "`nInitializing Admin Frontend Repository..." -ForegroundColor Yellow
cd "$PSScriptRoot\admin-frontend"
Remove-Item -Recurse -Force .git -ErrorAction SilentlyContinue
git init
git add .
git commit -m "initial commit: Hirely Admin Frontend"
git branch -M main
git remote add origin "https://github.com/$github_username/hirely-admin-frontend.git"
Write-Host "Local admin repo initialized and linked to: https://github.com/$github_username/hirely-admin-frontend.git" -ForegroundColor Green

Write-Host "`n==============================================" -ForegroundColor Green
Write-Host "     Initialization Completed Successfully!" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Go to GitHub and create three new empty repositories: 'hirely-frontend', 'hirely-backend', and 'hirely-admin-frontend'." -ForegroundColor White
Write-Host "2. Run the following push commands to upload your code:" -ForegroundColor White
Write-Host "   - For Frontend:      cd frontend; git push -u origin main" -ForegroundColor Cyan
Write-Host "   - For Backend:       cd backend; git push -u origin main" -ForegroundColor Cyan
Write-Host "   - For Admin Frontend: cd admin-frontend; git push -u origin main" -ForegroundColor Cyan
