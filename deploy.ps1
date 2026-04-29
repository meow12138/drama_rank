#Requires -RunAsAdministrator
###############################################################################
# drama-rank Windows 一键部署脚本 (PowerShell)
#
# 使用方法 (以管理员身份打开 PowerShell):
#   Set-ExecutionPolicy Bypass -Scope Process -Force
#   .\deploy.ps1
#
# 或者预设账号密码跳过交互:
#   $env:AUTH_USER="admin"; $env:AUTH_PASS="mypass123"; .\deploy.ps1
###############################################################################

$ErrorActionPreference = "Stop"

# ======================== 配置 ========================

$DEPLOY_DIR = "C:\drama-rank"
$REPO_URL = "https://github.com/meow12138/drama_rank.git"
$NODE_VERSION = "20.18.1"
$NPM_REGISTRY = "https://registry.npmmirror.com"
$PLAYWRIGHT_CDN = "https://npmmirror.com/mirrors/playwright/"

# ======================== 工具函数 ========================

function Write-Step($msg) { Write-Host "`n===== $msg =====`n" -ForegroundColor Cyan }
function Write-Ok($msg)   { Write-Host "[ OK ] $msg" -ForegroundColor Green }
function Write-Info($msg)  { Write-Host "[INFO] $msg" -ForegroundColor Blue }
function Write-Warn($msg)  { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg)   { Write-Host "[FAIL] $msg" -ForegroundColor Red }

# ======================== 0. 前置检查 ========================

Write-Step "0/6 前置检查"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Err "请以管理员身份运行 PowerShell"
    exit 1
}
Write-Ok "管理员权限"

# ======================== 1. 安装 Git ========================

Write-Step "1/6 检查 Git"

if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Ok "Git 已安装: $(git --version)"
} else {
    Write-Info "正在安装 Git..."
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
    } else {
        Write-Err "未检测到 Git，请手动安装: https://git-scm.com/download/win"
        exit 1
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Ok "Git 安装完成"
}

# ======================== 2. 安装 Node.js ========================

Write-Step "2/6 安装 Node.js"

if (Get-Command node -ErrorAction SilentlyContinue) {
    $currentNode = (node -v)
    if ($currentNode -match "^v20\.") {
        Write-Ok "Node.js $currentNode 已安装，跳过"
    } else {
        Write-Warn "当前 Node.js 版本 $currentNode，需要 v20.x"
        Write-Info "正在安装 Node.js $NODE_VERSION..."
        $nodeInstaller = "$env:TEMP\node-v${NODE_VERSION}-x64.msi"
        Invoke-WebRequest -Uri "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-x64.msi" -OutFile $nodeInstaller
        Start-Process msiexec.exe -ArgumentList "/i", $nodeInstaller, "/qn", "/norestart" -Wait
        Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
        Write-Ok "Node.js 安装完成"
    }
} else {
    Write-Info "正在从国内镜像下载 Node.js $NODE_VERSION..."
    $nodeInstaller = "$env:TEMP\node-v${NODE_VERSION}-x64.msi"
    Invoke-WebRequest -Uri "https://npmmirror.com/mirrors/node/v${NODE_VERSION}/node-v${NODE_VERSION}-x64.msi" -OutFile $nodeInstaller
    Start-Process msiexec.exe -ArgumentList "/i", $nodeInstaller, "/qn", "/norestart" -Wait
    Remove-Item $nodeInstaller -Force -ErrorAction SilentlyContinue
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")
    Write-Ok "Node.js 安装完成"
}

Write-Ok "Node.js $(node -v)"
Write-Ok "npm $(npm -v)"

npm config set registry $NPM_REGISTRY
Write-Ok "npm 镜像: $NPM_REGISTRY"

# ======================== 3. 克隆/更新项目 ========================

Write-Step "3/6 部署项目代码"

if (Test-Path "$DEPLOY_DIR\.git") {
    Write-Info "项目已存在，拉取最新代码..."
    Set-Location $DEPLOY_DIR
    git fetch --all 2>$null
    git reset --hard origin/main 2>$null
    if ($LASTEXITCODE -ne 0) { git reset --hard origin/master 2>$null }
    Write-Ok "代码已更新"
} else {
    Write-Info "克隆仓库: $REPO_URL"
    if (Test-Path $DEPLOY_DIR) { Remove-Item $DEPLOY_DIR -Recurse -Force }
    git clone $REPO_URL $DEPLOY_DIR --depth 1
    Write-Ok "代码克隆完成"
}

Set-Location $DEPLOY_DIR

# ======================== 4. 环境变量 + 依赖 + 构建 ========================

Write-Step "4/6 配置环境 & 构建项目"

$envFile = "$DEPLOY_DIR\.env"

if (-not (Test-Path $envFile)) {
    if (-not $env:AUTH_USER) {
        $env:AUTH_USER = Read-Host "请输入后台用户名 (AUTH_USER)"
        if (-not $env:AUTH_USER) { Write-Err "AUTH_USER 不能为空"; exit 1 }
    }
    if (-not $env:AUTH_PASS) {
        $env:AUTH_PASS = Read-Host "请输入后台密码 (AUTH_PASS)"
        if (-not $env:AUTH_PASS) { Write-Err "AUTH_PASS 不能为空"; exit 1 }
    }

    @"
DATABASE_URL="file:./prisma/dev.db"
AUTH_USER="$($env:AUTH_USER)"
AUTH_PASS="$($env:AUTH_PASS)"
PLAYWRIGHT_DOWNLOAD_HOST="$PLAYWRIGHT_CDN"
"@ | Set-Content -Path $envFile -Encoding UTF8

    Write-Ok ".env 已创建"
} else {
    Write-Info ".env 已存在，保留现有配置"
}

Write-Info "安装 npm 依赖 (使用国内镜像)..."
npm install --registry=$NPM_REGISTRY
Write-Ok "npm 依赖已安装"

Write-Info "生成 Prisma Client..."
npx prisma generate
Write-Ok "Prisma Client 已生成"

Write-Info "同步数据库..."
npx prisma db push --accept-data-loss 2>$null
if ($LASTEXITCODE -ne 0) { npx prisma db push }
Write-Ok "数据库已就绪"

Write-Info "构建 Next.js..."
npm run build
Write-Ok "项目构建完成"

# ======================== 5. Playwright ========================

Write-Step "5/6 安装 Playwright Chromium"

$env:PLAYWRIGHT_DOWNLOAD_HOST = $PLAYWRIGHT_CDN

Write-Info "下载 Chromium 浏览器..."
npx playwright install chromium
Write-Ok "Chromium 已安装"

# ======================== 6. PM2 启动服务 ========================

Write-Step "6/6 启动服务"

if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
    Write-Info "安装 PM2..."
    npm install -g pm2 --registry=$NPM_REGISTRY
}
Write-Ok "PM2 $(pm2 -v)"

$npmPath = (Get-Command npm).Source

if (-not (Test-Path "$DEPLOY_DIR\logs")) { New-Item -ItemType Directory -Path "$DEPLOY_DIR\logs" | Out-Null }

$ecosystem = @"
module.exports = {
  apps: [
    {
      name: 'drama-rank-web',
      cwd: '$($DEPLOY_DIR -replace '\\', '/')',
      script: '$($npmPath -replace '\\', '/')',
      args: 'run start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PLAYWRIGHT_DOWNLOAD_HOST: '$PLAYWRIGHT_CDN',
      },
      env_file: '$($DEPLOY_DIR -replace '\\', '/')/.env',
      max_memory_restart: '512M',
      restart_delay: 5000,
      max_restarts: 10,
      error_file: '$($DEPLOY_DIR -replace '\\', '/')/logs/web-error.log',
      out_file: '$($DEPLOY_DIR -replace '\\', '/')/logs/web-out.log',
      merge_logs: true,
    },
    {
      name: 'drama-rank-scheduler',
      cwd: '$($DEPLOY_DIR -replace '\\', '/')',
      script: '$($npmPath -replace '\\', '/')',
      args: 'run scheduler',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PLAYWRIGHT_DOWNLOAD_HOST: '$PLAYWRIGHT_CDN',
      },
      env_file: '$($DEPLOY_DIR -replace '\\', '/')/.env',
      max_memory_restart: '1G',
      restart_delay: 10000,
      max_restarts: 5,
      error_file: '$($DEPLOY_DIR -replace '\\', '/')/logs/scheduler-error.log',
      out_file: '$($DEPLOY_DIR -replace '\\', '/')/logs/scheduler-out.log',
      merge_logs: true,
    }
  ]
};
"@
$ecosystem | Set-Content -Path "$DEPLOY_DIR\ecosystem.config.cjs" -Encoding UTF8

pm2 delete drama-rank-web 2>$null
pm2 delete drama-rank-scheduler 2>$null
pm2 start "$DEPLOY_DIR\ecosystem.config.cjs"
pm2 save

Write-Ok "PM2 进程已启动"

# 创建开机自启计划任务
$taskName = "DramaRankPM2"
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
}

$pm2Path = (Get-Command pm2).Source
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -Command `"& '$pm2Path' resurrect`""
$trigger = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Description "drama-rank PM2 开机自启" | Out-Null
Write-Ok "开机自启已配置 (计划任务: $taskName)"

# 配置 Windows 防火墙
Write-Info "配置防火墙规则..."
Remove-NetFirewallRule -DisplayName "DramaRank-Web" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "DramaRank-Web" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow | Out-Null
Remove-NetFirewallRule -DisplayName "DramaRank-HTTP" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "DramaRank-HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow | Out-Null
Write-Ok "防火墙已放行 80 和 3000 端口"

# ======================== 完成 ========================

$serverIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -ne "127.0.0.1" -and $_.PrefixOrigin -ne "WellKnown" } | Select-Object -First 1).IPAddress
if (-not $serverIP) { $serverIP = "localhost" }

pm2 list

Write-Host ""
Write-Host "==============================================" -ForegroundColor Green
Write-Host "       drama-rank 部署成功!                   " -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  访问地址:  http://${serverIP}:3000" -ForegroundColor Cyan
Write-Host "  部署目录:  $DEPLOY_DIR" -ForegroundColor Cyan
Write-Host "  Node.js:   $(node -v)" -ForegroundColor Cyan
Write-Host ""
Write-Host "  常用命令:" -ForegroundColor Yellow
Write-Host "    pm2 list                        查看进程"
Write-Host "    pm2 logs drama-rank-web         查看 Web 日志"
Write-Host "    pm2 logs drama-rank-scheduler   查看爬虫日志"
Write-Host "    pm2 restart all                 重启所有服务"
Write-Host ""
Write-Host "  提醒: 请在阿里云安全组中放行 3000 端口!" -ForegroundColor Red
Write-Host ""
