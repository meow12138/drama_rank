<#
.SYNOPSIS
  drama-rank Windows one-click deployment script
.DESCRIPTION
  Usage (run as Administrator):
    Set-ExecutionPolicy Bypass -Scope Process -Force
    .\deploy.ps1
  Or pre-set credentials:
    $env:AUTH_USER="admin"; $env:AUTH_PASS="mypass123"; .\deploy.ps1
#>

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$DEPLOY_DIR    = "C:\drama-rank"
$REPO_URL      = "https://github.com/meow12138/drama_rank.git"
$NODE_VERSION  = "20.18.1"
$NPM_REGISTRY  = "https://registry.npmmirror.com"
$PLAYWRIGHT_CDN = "https://npmmirror.com/mirrors/playwright/"

function Write-Step($msg)  { Write-Host "`n===== $msg =====`n" -ForegroundColor Cyan }
function Write-Ok($msg)    { Write-Host "[ OK ] $msg" -ForegroundColor Green }
function Write-Info($msg)  { Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Warn($msg)  { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[FAIL] $msg" -ForegroundColor Red }

# ==================== 0. Check Admin ====================

Write-Step "0/6 Check prerequisites"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Err "Please run PowerShell as Administrator"
    exit 1
}
Write-Ok "Administrator privileges confirmed"

# ==================== 1. Git ====================

Write-Step "1/6 Check Git"

if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Ok "Git installed: $(git --version)"
} else {
    Write-Info "Installing Git via winget..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
    } else {
        Write-Err "Git not found. Please install manually: https://git-scm.com/download/win"
        exit 1
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Ok "Git installed"
}

# ==================== 2. Node.js ====================

Write-Step "2/6 Install Node.js"

$needInstall = $true
if (Get-Command node -ErrorAction SilentlyContinue) {
    $currentNode = (node -v)
    if ($currentNode -match "^v20\.") {
        Write-Ok "Node.js $currentNode already installed, skip"
        $needInstall = $false
    } else {
        Write-Warn "Current Node.js is $currentNode, need v20.x"
    }
}

if ($needInstall) {
    Write-Info "Downloading Node.js $NODE_VERSION from China mirror..."
    $nodeUrl = "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-x64.msi"
    $nodeInstaller = "$env:TEMP\nodejs.msi"
    Invoke-WebRequest -Uri $nodeUrl -OutFile $nodeInstaller
    Write-Info "Installing Node.js (silent)..."
    Start-Process msiexec.exe -ArgumentList "/i", $nodeInstaller, "/qn", "/norestart" -Wait
    Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Ok "Node.js installed"
}

Write-Ok "Node.js $(node -v)"
Write-Ok "npm $(npm -v)"

npm config set registry $NPM_REGISTRY
Write-Ok "npm registry: $NPM_REGISTRY"

# ==================== 3. Clone project ====================

Write-Step "3/6 Deploy project code"

if (Test-Path "$DEPLOY_DIR\.git") {
    Write-Info "Project exists, pulling latest code..."
    Set-Location $DEPLOY_DIR
    git fetch --all 2>&1 | Out-Null
    git reset --hard origin/main 2>&1 | Out-Null
    Write-Ok "Code updated"
} else {
    Write-Info "Cloning repo: $REPO_URL"
    if (Test-Path $DEPLOY_DIR) { Remove-Item $DEPLOY_DIR -Recurse -Force }
    git clone $REPO_URL $DEPLOY_DIR --depth 1
    Write-Ok "Code cloned"
}

Set-Location $DEPLOY_DIR

# ==================== 4. Env, deps, build ====================

Write-Step "4/6 Configure env and build"

$envFile = Join-Path $DEPLOY_DIR ".env"

if (-not (Test-Path $envFile)) {
    if (-not $env:AUTH_USER) {
        $env:AUTH_USER = Read-Host "Enter AUTH_USER (web login username)"
        if (-not $env:AUTH_USER) { Write-Err "AUTH_USER cannot be empty"; exit 1 }
    }
    if (-not $env:AUTH_PASS) {
        $env:AUTH_PASS = Read-Host "Enter AUTH_PASS (web login password)"
        if (-not $env:AUTH_PASS) { Write-Err "AUTH_PASS cannot be empty"; exit 1 }
    }

    $envContent = @(
        "DATABASE_URL=""file:./prisma/dev.db"""
        "AUTH_USER=""$($env:AUTH_USER)"""
        "AUTH_PASS=""$($env:AUTH_PASS)"""
        "PLAYWRIGHT_DOWNLOAD_HOST=""$PLAYWRIGHT_CDN"""
    )
    $envContent | Set-Content -Path $envFile -Encoding UTF8
    Write-Ok ".env created"
} else {
    Write-Info ".env already exists, keeping current config"
}

Write-Info "Installing npm dependencies (China mirror)..."
npm install --registry=$NPM_REGISTRY
Write-Ok "npm dependencies installed"

Write-Info "Generating Prisma Client..."
npx prisma generate
Write-Ok "Prisma Client generated"

Write-Info "Syncing database..."
npx prisma db push --accept-data-loss
Write-Ok "Database ready"

Write-Info "Building Next.js..."
npm run build
Write-Ok "Build complete"

# ==================== 5. Playwright ====================

Write-Step "5/6 Install Playwright Chromium"

$env:PLAYWRIGHT_DOWNLOAD_HOST = $PLAYWRIGHT_CDN

Write-Info "Downloading Chromium browser..."
npx playwright install chromium
Write-Ok "Chromium installed"

# ==================== 6. PM2 start ====================

Write-Step "6/6 Start services with PM2"

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Info "Installing PM2..."
    npm install -g pm2 --registry=$NPM_REGISTRY
}
Write-Ok "PM2 $(pm2 -v)"

$logsDir = Join-Path $DEPLOY_DIR "logs"
if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir | Out-Null }

# Write ecosystem.config.cjs using .NET API to avoid PowerShell parsing issues
$npmPath = ((Get-Command npm).Source) -replace '\\', '/'
$deployDirUnix = $DEPLOY_DIR -replace '\\', '/'
$ecosystemContent = @"
module.exports = {
  apps: [
    {
      name: 'drama-rank-web',
      cwd: '$deployDirUnix',
      script: '$npmPath',
      args: 'run start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '512M',
      restart_delay: 5000,
      max_restarts: 10,
      error_file: '$deployDirUnix/logs/web-error.log',
      out_file: '$deployDirUnix/logs/web-out.log',
      merge_logs: true
    },
    {
      name: 'drama-rank-scheduler',
      cwd: '$deployDirUnix',
      script: '$npmPath',
      args: 'run scheduler',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '1G',
      restart_delay: 10000,
      max_restarts: 5,
      error_file: '$deployDirUnix/logs/scheduler-error.log',
      out_file: '$deployDirUnix/logs/scheduler-out.log',
      merge_logs: true
    }
  ]
};
"@

$ecosystemPath = Join-Path $DEPLOY_DIR "ecosystem.config.cjs"
[System.IO.File]::WriteAllText($ecosystemPath, $ecosystemContent, [System.Text.Encoding]::UTF8)
Write-Ok "ecosystem.config.cjs created"

$ErrorActionPreference = "Continue"
try { pm2 delete drama-rank-web 2>&1 | Out-Null } catch {}
try { pm2 delete drama-rank-scheduler 2>&1 | Out-Null } catch {}
pm2 start $ecosystemPath 2>&1 | Write-Host
pm2 save 2>&1 | Write-Host
$ErrorActionPreference = "Stop"
Write-Ok "PM2 processes started"

# Scheduled task for auto-start on boot
$taskName = "DramaRankPM2"
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -Command `"pm2 resurrect`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description "drama-rank PM2 auto start" | Out-Null
Write-Ok "Auto-start on boot configured"

# Firewall rules
Write-Info "Configuring firewall..."
Remove-NetFirewallRule -DisplayName "DramaRank-Web" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "DramaRank-Web" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null
Remove-NetFirewallRule -DisplayName "DramaRank-HTTP" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "DramaRank-HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow | Out-Null
Write-Ok "Firewall rules added (port 80, 3000)"

# ==================== Done ====================

$serverIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1).IPAddress
if (-not $serverIP) { $serverIP = "localhost" }

$ErrorActionPreference = "Continue"
pm2 list 2>&1 | Write-Host

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "       drama-rank deploy SUCCESS!             " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  URL:        http://${serverIP}:3000" -ForegroundColor Cyan
Write-Host "  Deploy dir: $DEPLOY_DIR" -ForegroundColor Cyan
Write-Host "  Node.js:    $(node -v)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Commands:" -ForegroundColor Yellow
Write-Host "    pm2 list                        # check processes"
Write-Host "    pm2 logs drama-rank-web         # web logs"
Write-Host "    pm2 logs drama-rank-scheduler   # scheduler logs"
Write-Host "    pm2 restart all                 # restart all"
Write-Host ""
Write-Host "  REMINDER: Open port 3000 in Alibaba Cloud Security Group!" -ForegroundColor Red
Write-Host ""
