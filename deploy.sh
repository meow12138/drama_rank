#!/usr/bin/env bash
###############################################################################
# drama-rank 一键部署脚本
# 适用于阿里云 ECS (Ubuntu/Debian/CentOS)
#
# 使用方法:
#   1. 将此脚本上传到服务器，或在服务器上直接下载:
#      curl -O https://raw.githubusercontent.com/meow12138/drama_rank/main/deploy.sh
#   2. 赋予执行权限:
#      chmod +x deploy.sh
#   3. 以 root 或 sudo 权限运行:
#      sudo bash deploy.sh
#
# 功能:
#   - 自动检测操作系统 (Ubuntu/Debian/CentOS)
#   - 替换系统包管理器为阿里云镜像源
#   - 安装 Node.js 20 LTS (通过 nvm，使用国内镜像)
#   - 克隆项目并安装依赖 (使用 npmmirror)
#   - 初始化数据库 (Prisma + SQLite)
#   - 安装 Playwright Chromium 及系统依赖 (使用国内镜像)
#   - 使用 PM2 管理 Next.js 和 scheduler 进程
#   - 配置 Nginx 反向代理 (80 -> 3000)
#   - 配置防火墙规则
#
# 环境变量 (可提前 export，否则脚本会交互式询问):
#   AUTH_USER     - 后台认证用户名
#   AUTH_PASS     - 后台认证密码
#   DEPLOY_DIR    - 部署目录 (默认: /opt/drama-rank)
#   REPO_URL      - Git 仓库地址 (默认: https://github.com/meow12138/drama_rank.git)
#   SKIP_NGINX    - 设为 1 跳过 Nginx 安装
#
# 注意:
#   - 脚本设计为幂等，可重复运行不会出错
#   - 重复运行时会拉取最新代码、重新构建、重启服务
###############################################################################

set -euo pipefail

# ======================= 颜色与输出工具 =======================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*"; }
step()    { echo -e "\n${CYAN}${BOLD}===> $* <=== ${NC}\n"; }

# 错误处理
trap 'error "脚本在第 $LINENO 行出错，命令: $BASH_COMMAND"; exit 1' ERR

# ======================= 默认配置 =======================

DEPLOY_DIR="${DEPLOY_DIR:-/opt/drama-rank}"
REPO_URL="${REPO_URL:-https://github.com/meow12138/drama_rank.git}"
NODE_VERSION="20"
NVM_DIR_PATH="${NVM_DIR:-$HOME/.nvm}"

# 国内镜像地址
NVM_GITEE_REPO="https://gitee.com/mirrors/nvm.git"
NODE_MIRROR="https://npmmirror.com/mirrors/node/"
NPM_REGISTRY="https://registry.npmmirror.com"
PLAYWRIGHT_MIRROR="https://npmmirror.com/mirrors/playwright/"

# ======================= 前置检查 =======================

step "前置检查"

# 检查 root 权限
if [[ $EUID -ne 0 ]]; then
    error "请使用 root 权限运行此脚本: sudo bash deploy.sh"
    exit 1
fi
success "root 权限检查通过"

# 检测操作系统
detect_os() {
    if [[ -f /etc/os-release ]]; then
        . /etc/os-release
        OS_ID="${ID}"
        OS_VERSION="${VERSION_ID:-}"
    elif [[ -f /etc/redhat-release ]]; then
        OS_ID="centos"
    else
        error "无法检测操作系统类型"
        exit 1
    fi

    case "${OS_ID}" in
        ubuntu|debian)
            PKG_MANAGER="apt-get"
            OS_FAMILY="debian"
            ;;
        centos|rhel|almalinux|rocky|fedora)
            PKG_MANAGER="yum"
            OS_FAMILY="rhel"
            ;;
        *)
            error "不支持的操作系统: ${OS_ID}，仅支持 Ubuntu/Debian/CentOS"
            exit 1
            ;;
    esac

    success "检测到操作系统: ${OS_ID} ${OS_VERSION:-} (${OS_FAMILY} 系列)"
}

detect_os

# ======================= 1. 系统镜像源配置 =======================

step "1/8 配置系统镜像源 (阿里云)"

configure_apt_mirror() {
    local sources_file="/etc/apt/sources.list"
    local backup_file="/etc/apt/sources.list.bak.deploy"

    # 检查是否已经配置过阿里云镜像
    if grep -q "mirrors.aliyun.com" "$sources_file" 2>/dev/null; then
        info "APT 源已配置为阿里云镜像，跳过"
        return
    fi

    # 备份原始源
    if [[ ! -f "$backup_file" ]]; then
        cp "$sources_file" "$backup_file"
        info "已备份原始 sources.list -> ${backup_file}"
    fi

    # 获取版本代号
    local codename
    codename=$(lsb_release -cs 2>/dev/null || echo "")
    if [[ -z "$codename" ]]; then
        codename=$(. /etc/os-release && echo "${VERSION_CODENAME:-${UBUNTU_CODENAME:-}}")
    fi

    if [[ "${OS_ID}" == "ubuntu" && -n "$codename" ]]; then
        cat > "$sources_file" <<EOF
deb http://mirrors.aliyun.com/ubuntu/ ${codename} main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ ${codename}-updates main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ ${codename}-backports main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ ${codename}-security main restricted universe multiverse
EOF
        success "Ubuntu APT 源已切换到阿里云镜像 (${codename})"
    elif [[ "${OS_ID}" == "debian" && -n "$codename" ]]; then
        cat > "$sources_file" <<EOF
deb http://mirrors.aliyun.com/debian/ ${codename} main contrib non-free
deb http://mirrors.aliyun.com/debian/ ${codename}-updates main contrib non-free
deb http://mirrors.aliyun.com/debian-security/ ${codename}-security main contrib non-free
EOF
        success "Debian APT 源已切换到阿里云镜像 (${codename})"
    else
        warn "无法确定系统版本代号，跳过镜像源配置"
        return
    fi
}

configure_yum_mirror() {
    local repo_file="/etc/yum.repos.d/CentOS-Base.repo"
    local backup_file="/etc/yum.repos.d/CentOS-Base.repo.bak.deploy"

    if grep -q "mirrors.aliyun.com" "$repo_file" 2>/dev/null; then
        info "YUM 源已配置为阿里云镜像，跳过"
        return
    fi

    if [[ -f "$repo_file" && ! -f "$backup_file" ]]; then
        cp "$repo_file" "$backup_file"
        info "已备份原始 CentOS-Base.repo"
    fi

    # 下载阿里云镜像配置
    if command -v curl &>/dev/null; then
        curl -fsSL -o "$repo_file" \
            "http://mirrors.aliyun.com/repo/Centos-7.repo" 2>/dev/null || \
        curl -fsSL -o "$repo_file" \
            "http://mirrors.aliyun.com/repo/Centos-vault-8.5.2111.repo" 2>/dev/null || \
            warn "自动下载阿里云 YUM 源失败，请手动配置"
    fi
    success "YUM 源已切换到阿里云镜像"
}

if [[ "$OS_FAMILY" == "debian" ]]; then
    configure_apt_mirror
else
    configure_yum_mirror
fi

# ======================= 2. 安装系统依赖 =======================

step "2/8 安装系统依赖"

if [[ "$OS_FAMILY" == "debian" ]]; then
    info "更新 APT 索引..."
    apt-get update -y -qq

    info "安装基础依赖包..."
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
        git curl wget build-essential ca-certificates \
        lsb-release gnupg2 software-properties-common \
        sqlite3 libsqlite3-dev \
        > /dev/null 2>&1

    success "Debian/Ubuntu 系统依赖安装完成"

else
    info "更新 YUM 缓存..."
    yum makecache -y -q 2>/dev/null || true

    info "安装基础依赖包..."
    yum groupinstall -y -q "Development Tools" 2>/dev/null || \
        yum install -y -q gcc gcc-c++ make 2>/dev/null || true
    yum install -y -q git curl wget ca-certificates sqlite sqlite-devel \
        > /dev/null 2>&1

    success "CentOS/RHEL 系统依赖安装完成"
fi

# ======================= 3. 安装 Node.js (nvm + 国内镜像) =======================

step "3/8 安装 Node.js ${NODE_VERSION} (nvm + 国内镜像)"

install_nvm() {
    if [[ -d "${NVM_DIR_PATH}" && -s "${NVM_DIR_PATH}/nvm.sh" ]]; then
        info "nvm 已安装，跳过安装步骤"
    else
        info "从 Gitee 镜像克隆 nvm..."
        rm -rf "${NVM_DIR_PATH}"
        git clone "${NVM_GITEE_REPO}" "${NVM_DIR_PATH}" --depth 1 2>/dev/null
        success "nvm 安装完成"
    fi

    # 加载 nvm
    export NVM_DIR="${NVM_DIR_PATH}"
    # shellcheck source=/dev/null
    . "${NVM_DIR}/nvm.sh"

    # 设置 Node.js 下载镜像
    export NVM_NODEJS_ORG_MIRROR="${NODE_MIRROR}"
}

install_nvm

# 安装 Node.js
CURRENT_NODE=$(nvm current 2>/dev/null || echo "none")
if [[ "$CURRENT_NODE" == v${NODE_VERSION}.* ]]; then
    info "Node.js ${CURRENT_NODE} 已安装，跳过"
else
    info "从国内镜像安装 Node.js v${NODE_VERSION} LTS..."
    nvm install "${NODE_VERSION}" --lts
    nvm alias default "${NODE_VERSION}"
fi

nvm use "${NODE_VERSION}"
success "Node.js $(node -v) 已就绪"
success "npm $(npm -v) 已就绪"

# 设置 npm 国内镜像
info "设置 npm registry 为国内镜像..."
npm config set registry "${NPM_REGISTRY}"
success "npm registry: $(npm config get registry)"

# 写入 nvm 到 profile，确保后续登录 / PM2 重启也能加载
NVM_PROFILE_SNIPPET='
# nvm (drama-rank deploy)
export NVM_DIR="'"${NVM_DIR_PATH}"'"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export NVM_NODEJS_ORG_MIRROR="'"${NODE_MIRROR}"'"
'

for profile_file in "$HOME/.bashrc" "$HOME/.profile"; do
    if [[ -f "$profile_file" ]]; then
        if ! grep -q "nvm (drama-rank deploy)" "$profile_file" 2>/dev/null; then
            echo "$NVM_PROFILE_SNIPPET" >> "$profile_file"
            info "已将 nvm 配置写入 ${profile_file}"
        fi
    fi
done

# ======================= 4. 克隆 / 更新项目代码 =======================

step "4/8 部署项目代码"

if [[ -d "${DEPLOY_DIR}/.git" ]]; then
    info "项目目录已存在，拉取最新代码..."
    cd "${DEPLOY_DIR}"
    git fetch --all 2>/dev/null
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null
    success "代码已更新到最新版本"
else
    info "克隆项目仓库: ${REPO_URL}"
    mkdir -p "$(dirname "${DEPLOY_DIR}")"
    rm -rf "${DEPLOY_DIR}"
    git clone "${REPO_URL}" "${DEPLOY_DIR}" --depth 1
    success "项目克隆完成"
fi

cd "${DEPLOY_DIR}"
info "当前部署目录: $(pwd)"

# ======================= 5. 配置环境变量 =======================

step "5/8 配置环境变量与依赖安装"

ENV_FILE="${DEPLOY_DIR}/.env"

if [[ -f "$ENV_FILE" ]]; then
    info ".env 文件已存在，保留现有配置"
    info "当前 .env 内容 (隐藏密码):"
    while IFS= read -r line; do
        if [[ "$line" == AUTH_PASS=* ]]; then
            echo "  AUTH_PASS=********"
        else
            echo "  $line"
        fi
    done < "$ENV_FILE"
    echo ""

    # 询问是否要重新配置
    read -r -p "$(echo -e "${YELLOW}是否重新配置 .env? [y/N]: ${NC}")" RECONFIG_ENV
    if [[ "${RECONFIG_ENV,,}" != "y" ]]; then
        info "保留现有 .env 配置"
    else
        rm -f "$ENV_FILE"
    fi
fi

if [[ ! -f "$ENV_FILE" ]]; then
    info "创建 .env 配置文件..."

    # DATABASE_URL
    DEFAULT_DB="file:./prisma/dev.db"
    read -r -p "$(echo -e "${CYAN}请输入 DATABASE_URL [默认: ${DEFAULT_DB}]: ${NC}")" INPUT_DB_URL
    DB_URL="${INPUT_DB_URL:-${DEFAULT_DB}}"

    # AUTH_USER
    if [[ -n "${AUTH_USER:-}" ]]; then
        info "使用环境变量中的 AUTH_USER"
    else
        read -r -p "$(echo -e "${CYAN}请输入 AUTH_USER (后台认证用户名): ${NC}")" AUTH_USER
        if [[ -z "$AUTH_USER" ]]; then
            error "AUTH_USER 不能为空"
            exit 1
        fi
    fi

    # AUTH_PASS
    if [[ -n "${AUTH_PASS:-}" ]]; then
        info "使用环境变量中的 AUTH_PASS"
    else
        read -r -s -p "$(echo -e "${CYAN}请输入 AUTH_PASS (后台认证密码): ${NC}")" AUTH_PASS
        echo ""
        if [[ -z "$AUTH_PASS" ]]; then
            error "AUTH_PASS 不能为空"
            exit 1
        fi
    fi

    cat > "$ENV_FILE" <<EOF
DATABASE_URL="${DB_URL}"
AUTH_USER="${AUTH_USER}"
AUTH_PASS="${AUTH_PASS}"
EOF

    chmod 600 "$ENV_FILE"
    success ".env 文件已创建 (权限: 600)"
fi

# ======================= 6. 安装项目依赖并构建 =======================

info "安装项目 npm 依赖 (使用 npmmirror)..."
npm install --registry="${NPM_REGISTRY}" 2>&1 | tail -5
success "npm 依赖安装完成"

info "生成 Prisma Client..."
npx prisma generate
success "Prisma Client 已生成"

info "同步数据库结构..."
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push
success "数据库结构已同步"

info "构建 Next.js 项目..."
npm run build
success "项目构建完成"

# ======================= 7. 安装 Playwright 及 Chromium =======================

step "6/8 安装 Playwright Chromium (国内镜像)"

info "设置 Playwright 下载镜像..."
export PLAYWRIGHT_DOWNLOAD_HOST="${PLAYWRIGHT_MIRROR}"

# 将 Playwright 镜像地址写入环境文件供 PM2 使用
PLAYWRIGHT_ENV_LINE="PLAYWRIGHT_DOWNLOAD_HOST=${PLAYWRIGHT_MIRROR}"
if ! grep -q "PLAYWRIGHT_DOWNLOAD_HOST" "$ENV_FILE" 2>/dev/null; then
    echo "${PLAYWRIGHT_ENV_LINE}" >> "$ENV_FILE"
fi

info "安装 Playwright Chromium 浏览器..."
npx playwright install chromium 2>&1 | tail -3
success "Playwright Chromium 安装完成"

info "安装 Playwright 系统依赖..."
if [[ "$OS_FAMILY" == "debian" ]]; then
    npx playwright install-deps chromium 2>&1 | tail -5 || {
        warn "Playwright 系统依赖自动安装失败，尝试手动安装常见依赖..."
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
            libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
            libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
            libatspi2.0-0 libxcomposite1 libxdamage1 \
            libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
            libcairo2 libasound2 libwayland-client0 \
            > /dev/null 2>&1 || true
    }
else
    npx playwright install-deps chromium 2>&1 | tail -5 || {
        warn "Playwright 系统依赖自动安装失败，尝试手动安装常见依赖..."
        yum install -y -q \
            nss nspr atk at-spi2-atk cups-libs libdrm dbus-libs \
            libxkbcommon libXcomposite libXdamage libXfixes libXrandr \
            mesa-libgbm pango cairo alsa-lib \
            > /dev/null 2>&1 || true
    }
fi
success "Playwright 系统依赖安装完成"

# ======================= 8. PM2 进程管理 =======================

step "7/8 配置 PM2 进程管理"

# 获取 node 和 npm 实际路径 (nvm 下的路径)
NODE_PATH=$(which node)
NPM_PATH=$(which npm)
NPX_PATH=$(which npx)

info "Node 路径: ${NODE_PATH}"
info "npm 路径: ${NPM_PATH}"

# 安装 PM2
if command -v pm2 &>/dev/null; then
    info "PM2 已安装: $(pm2 -v)"
else
    info "安装 PM2..."
    npm install -g pm2 --registry="${NPM_REGISTRY}"
    success "PM2 安装完成: $(pm2 -v)"
fi

# 创建 PM2 ecosystem 配置文件
PM2_CONFIG="${DEPLOY_DIR}/ecosystem.config.cjs"
info "生成 PM2 配置文件: ${PM2_CONFIG}"

cat > "${PM2_CONFIG}" <<EOF
module.exports = {
  apps: [
    {
      name: 'drama-rank-web',
      cwd: '${DEPLOY_DIR}',
      script: '${NPM_PATH}',
      args: 'run start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PLAYWRIGHT_DOWNLOAD_HOST: '${PLAYWRIGHT_MIRROR}',
      },
      env_file: '${DEPLOY_DIR}/.env',
      max_memory_restart: '512M',
      restart_delay: 5000,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '${DEPLOY_DIR}/logs/web-error.log',
      out_file: '${DEPLOY_DIR}/logs/web-out.log',
      merge_logs: true,
    },
    {
      name: 'drama-rank-scheduler',
      cwd: '${DEPLOY_DIR}',
      script: '${NPM_PATH}',
      args: 'run scheduler',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PLAYWRIGHT_DOWNLOAD_HOST: '${PLAYWRIGHT_MIRROR}',
      },
      env_file: '${DEPLOY_DIR}/.env',
      max_memory_restart: '1G',
      restart_delay: 10000,
      max_restarts: 5,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: '${DEPLOY_DIR}/logs/scheduler-error.log',
      out_file: '${DEPLOY_DIR}/logs/scheduler-out.log',
      merge_logs: true,
    }
  ]
};
EOF

# 创建日志目录
mkdir -p "${DEPLOY_DIR}/logs"

# 停止旧的进程（如果存在）
info "停止旧的 PM2 进程 (如果存在)..."
pm2 delete drama-rank-web 2>/dev/null || true
pm2 delete drama-rank-scheduler 2>/dev/null || true

# 启动服务
info "启动 drama-rank 服务..."
pm2 start "${PM2_CONFIG}"
success "PM2 进程已启动"

# 保存 PM2 进程列表
pm2 save
success "PM2 进程列表已保存"

# 设置 PM2 开机自启
info "配置 PM2 开机自启..."
pm2 startup systemd -u root --hp /root 2>/dev/null || \
pm2 startup 2>/dev/null || \
    warn "PM2 开机自启配置失败，请手动运行: pm2 startup"
pm2 save
success "PM2 开机自启已配置"

# 显示进程状态
echo ""
pm2 list
echo ""

# ======================= 9. Nginx 反向代理 =======================

step "8/8 配置 Nginx 反向代理"

if [[ "${SKIP_NGINX:-0}" == "1" ]]; then
    warn "跳过 Nginx 安装 (SKIP_NGINX=1)"
else
    # 安装 Nginx
    if command -v nginx &>/dev/null; then
        info "Nginx 已安装: $(nginx -v 2>&1)"
    else
        info "安装 Nginx..."
        if [[ "$OS_FAMILY" == "debian" ]]; then
            DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx > /dev/null 2>&1
        else
            yum install -y -q epel-release 2>/dev/null || true
            yum install -y -q nginx > /dev/null 2>&1
        fi
        success "Nginx 安装完成"
    fi

    # 配置 Nginx
    NGINX_CONF="/etc/nginx/sites-available/drama-rank"
    NGINX_CONF_LINK="/etc/nginx/sites-enabled/drama-rank"

    # CentOS 没有 sites-available 目录结构，使用 conf.d
    if [[ "$OS_FAMILY" == "rhel" ]]; then
        NGINX_CONF="/etc/nginx/conf.d/drama-rank.conf"
        NGINX_CONF_LINK=""
    fi

    info "生成 Nginx 配置..."

    cat > "${NGINX_CONF}" <<'NGINX_EOF'
server {
    listen 80;
    server_name _;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    # 静态文件缓存
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Next.js 应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINX_EOF

    # Debian/Ubuntu: 创建软链接并禁用默认站点
    if [[ "$OS_FAMILY" == "debian" && -n "$NGINX_CONF_LINK" ]]; then
        mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
        ln -sf "${NGINX_CONF}" "${NGINX_CONF_LINK}"
        # 禁用默认站点 (如果存在)
        rm -f /etc/nginx/sites-enabled/default
        info "已创建 Nginx 站点配置软链接"
    fi

    # 测试 Nginx 配置
    info "测试 Nginx 配置..."
    if nginx -t 2>&1; then
        success "Nginx 配置测试通过"
    else
        error "Nginx 配置测试失败，请检查配置文件: ${NGINX_CONF}"
        warn "跳过 Nginx 重启，请手动修复后运行: nginx -t && systemctl restart nginx"
    fi

    # 启动/重启 Nginx
    info "启动 Nginx..."
    systemctl enable nginx 2>/dev/null || true
    systemctl restart nginx 2>/dev/null || systemctl start nginx 2>/dev/null || {
        warn "systemctl 不可用，尝试直接启动 nginx..."
        nginx -s reload 2>/dev/null || nginx
    }
    success "Nginx 已启动"
fi

# ======================= 防火墙配置 =======================

step "配置防火墙"

configure_firewall() {
    # 尝试 ufw (Ubuntu/Debian)
    if command -v ufw &>/dev/null; then
        info "检测到 ufw 防火墙"
        ufw allow 80/tcp   2>/dev/null || true
        ufw allow 443/tcp  2>/dev/null || true
        ufw allow 3000/tcp 2>/dev/null || true
        ufw allow 22/tcp   2>/dev/null || true
        # 不自动启用 ufw，避免锁住 SSH
        success "ufw 规则已添加 (80, 443, 3000, 22)"
        return
    fi

    # 尝试 firewalld (CentOS)
    if command -v firewall-cmd &>/dev/null; then
        info "检测到 firewalld 防火墙"
        firewall-cmd --permanent --add-port=80/tcp   2>/dev/null || true
        firewall-cmd --permanent --add-port=443/tcp  2>/dev/null || true
        firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
        firewall-cmd --reload 2>/dev/null || true
        success "firewalld 规则已添加 (80, 443, 3000)"
        return
    fi

    # 尝试 iptables
    if command -v iptables &>/dev/null; then
        info "检测到 iptables 防火墙"
        iptables -C INPUT -p tcp --dport 80   -j ACCEPT 2>/dev/null || \
            iptables -A INPUT -p tcp --dport 80   -j ACCEPT
        iptables -C INPUT -p tcp --dport 443  -j ACCEPT 2>/dev/null || \
            iptables -A INPUT -p tcp --dport 443  -j ACCEPT
        iptables -C INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || \
            iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
        success "iptables 规则已添加 (80, 443, 3000)"
        return
    fi

    warn "未检测到防火墙工具，请手动开放 80 和 3000 端口"
    warn "阿里云 ECS 还需在安全组中放行对应端口"
}

configure_firewall
warn "提醒: 请确保阿里云 ECS 安全组已放行 80 和 3000 端口"

# ======================= 部署完成 =======================

echo ""
echo -e "${GREEN}${BOLD}============================================${NC}"
echo -e "${GREEN}${BOLD}    drama-rank 部署完成!                    ${NC}"
echo -e "${GREEN}${BOLD}============================================${NC}"
echo ""
echo -e "  ${CYAN}部署目录:${NC}       ${DEPLOY_DIR}"
echo -e "  ${CYAN}Node.js:${NC}        $(node -v)"
echo -e "  ${CYAN}npm:${NC}            $(npm -v)"
echo -e "  ${CYAN}PM2:${NC}            $(pm2 -v 2>/dev/null || echo 'N/A')"
echo ""
echo -e "  ${CYAN}Web 服务:${NC}       http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost'):3000"
if [[ "${SKIP_NGINX:-0}" != "1" ]]; then
echo -e "  ${CYAN}Nginx 代理:${NC}     http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'localhost')"
fi
echo ""
echo -e "  ${YELLOW}常用命令:${NC}"
echo -e "    pm2 list                       # 查看进程状态"
echo -e "    pm2 logs drama-rank-web        # 查看 Web 日志"
echo -e "    pm2 logs drama-rank-scheduler  # 查看调度器日志"
echo -e "    pm2 restart all                # 重启所有服务"
echo -e "    pm2 monit                      # 进程监控面板"
echo ""
echo -e "  ${YELLOW}配置文件:${NC}"
echo -e "    ${DEPLOY_DIR}/.env                  # 环境变量"
echo -e "    ${DEPLOY_DIR}/ecosystem.config.cjs   # PM2 配置"
if [[ "${SKIP_NGINX:-0}" != "1" ]]; then
if [[ "$OS_FAMILY" == "rhel" ]]; then
echo -e "    /etc/nginx/conf.d/drama-rank.conf   # Nginx 配置"
else
echo -e "    /etc/nginx/sites-available/drama-rank  # Nginx 配置"
fi
fi
echo ""
echo -e "  ${RED}注意: 请确保阿里云安全组已开放 80 和 3000 端口!${NC}"
echo ""
