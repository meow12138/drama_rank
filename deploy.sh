#!/usr/bin/env bash
###############################################################################
# drama-rank 一键部署脚本 (阿里云 ECS)
#
# 使用方法 (在 ECS Linux 服务器上):
#   curl -fsSL https://raw.githubusercontent.com/meow12138/drama_rank/main/deploy.sh -o deploy.sh
#   chmod +x deploy.sh
#   sudo bash deploy.sh
#
# 支持环境变量预设 (可选，不设则交互式询问):
#   AUTH_USER=admin AUTH_PASS=mypass123 sudo -E bash deploy.sh
#
# 支持系统: Ubuntu 20+, Debian 11+, CentOS 7+
###############################################################################

set -euo pipefail

# ======================== 颜色输出 ========================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()      { echo -e "${GREEN}[ OK ]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()     { echo -e "${RED}[FAIL]${NC} $*"; }
step()    { echo -e "\n${CYAN}${BOLD}===== $* =====${NC}\n"; }

trap 'err "出错于第 $LINENO 行: $BASH_COMMAND"; exit 1' ERR

# ======================== 配置 ========================

DEPLOY_DIR="${DEPLOY_DIR:-/opt/drama-rank}"
REPO_URL="${REPO_URL:-https://github.com/meow12138/drama_rank.git}"
NODE_MAJOR=20
NPM_REGISTRY="https://registry.npmmirror.com"
PLAYWRIGHT_CDN="https://npmmirror.com/mirrors/playwright/"

# ======================== 0. 前置检查 ========================

step "0/7 前置检查"

if [[ $EUID -ne 0 ]]; then
    err "请使用 root 权限运行: sudo bash deploy.sh"
    exit 1
fi
ok "root 权限"

# 检测系统
if [[ -f /etc/os-release ]]; then
    . /etc/os-release
    OS_ID="${ID}"
else
    err "无法检测操作系统"; exit 1
fi

case "${OS_ID}" in
    ubuntu|debian) PKG="apt-get"; OS_FAMILY="debian" ;;
    centos|rhel|almalinux|rocky|fedora) PKG="yum"; OS_FAMILY="rhel" ;;
    *) err "不支持的系统: ${OS_ID}"; exit 1 ;;
esac
ok "系统: ${OS_ID} (${OS_FAMILY})"

# ======================== 1. 系统镜像源 ========================

step "1/7 配置阿里云镜像源"

if [[ "$OS_FAMILY" == "debian" ]]; then
    if ! grep -q "mirrors.aliyun.com" /etc/apt/sources.list 2>/dev/null; then
        cp /etc/apt/sources.list /etc/apt/sources.list.bak 2>/dev/null || true
        CODENAME=$(. /etc/os-release && echo "${VERSION_CODENAME:-${UBUNTU_CODENAME:-}}")
        if [[ "${OS_ID}" == "ubuntu" && -n "$CODENAME" ]]; then
            cat > /etc/apt/sources.list <<EOF
deb http://mirrors.aliyun.com/ubuntu/ ${CODENAME} main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ ${CODENAME}-updates main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ ${CODENAME}-security main restricted universe multiverse
EOF
            ok "Ubuntu APT 源已切换到阿里云 (${CODENAME})"
        elif [[ "${OS_ID}" == "debian" && -n "$CODENAME" ]]; then
            cat > /etc/apt/sources.list <<EOF
deb http://mirrors.aliyun.com/debian/ ${CODENAME} main contrib non-free
deb http://mirrors.aliyun.com/debian/ ${CODENAME}-updates main contrib non-free
deb http://mirrors.aliyun.com/debian-security/ ${CODENAME}-security main contrib non-free
EOF
            ok "Debian APT 源已切换到阿里云 (${CODENAME})"
        fi
    else
        info "APT 源已是阿里云镜像，跳过"
    fi
else
    if ! grep -q "mirrors.aliyun.com" /etc/yum.repos.d/*.repo 2>/dev/null; then
        curl -fsSL -o /etc/yum.repos.d/CentOS-Base.repo \
            http://mirrors.aliyun.com/repo/Centos-7.repo 2>/dev/null || true
        ok "YUM 源已切换到阿里云"
    else
        info "YUM 源已是阿里云镜像，跳过"
    fi
fi

# ======================== 2. 系统依赖 ========================

step "2/7 安装系统依赖"

if [[ "$OS_FAMILY" == "debian" ]]; then
    apt-get update -y -qq 2>/dev/null
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
        git curl wget build-essential ca-certificates gnupg \
        sqlite3 libsqlite3-dev lsb-release > /dev/null 2>&1
else
    yum makecache -y -q 2>/dev/null || true
    yum install -y -q gcc gcc-c++ make git curl wget ca-certificates \
        sqlite sqlite-devel > /dev/null 2>&1 || true
fi
ok "系统依赖已安装"

# ======================== 3. Node.js 20 ========================

step "3/7 安装 Node.js ${NODE_MAJOR}"

if command -v node &>/dev/null && [[ "$(node -v)" == v${NODE_MAJOR}.* ]]; then
    info "Node.js $(node -v) 已安装，跳过"
else
    info "通过 NodeSource 安装 Node.js ${NODE_MAJOR}..."
    if [[ "$OS_FAMILY" == "debian" ]]; then
        mkdir -p /etc/apt/keyrings
        curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
            | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true
        echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
            > /etc/apt/sources.list.d/nodesource.list
        apt-get update -y -qq 2>/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs > /dev/null 2>&1
    else
        curl -fsSL https://rpm.nodesource.com/setup_${NODE_MAJOR}.x | bash - > /dev/null 2>&1
        yum install -y -q nodejs > /dev/null 2>&1
    fi
fi

ok "Node.js $(node -v)"
ok "npm $(npm -v)"

npm config set registry "${NPM_REGISTRY}"
ok "npm 镜像: ${NPM_REGISTRY}"

# ======================== 4. 克隆/更新项目 ========================

step "4/7 部署项目代码"

if [[ -d "${DEPLOY_DIR}/.git" ]]; then
    info "项目已存在，拉取最新代码..."
    cd "${DEPLOY_DIR}"
    git fetch --all 2>/dev/null
    git reset --hard origin/main 2>/dev/null || git reset --hard origin/master 2>/dev/null
    ok "代码已更新"
else
    info "克隆仓库: ${REPO_URL}"
    mkdir -p "$(dirname "${DEPLOY_DIR}")"
    rm -rf "${DEPLOY_DIR}"
    git clone "${REPO_URL}" "${DEPLOY_DIR}" --depth 1
    ok "代码克隆完成"
fi

cd "${DEPLOY_DIR}"

# ======================== 5. 环境变量 + 依赖 + 构建 ========================

step "5/7 配置环境 & 构建项目"

ENV_FILE="${DEPLOY_DIR}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    # AUTH_USER
    if [[ -z "${AUTH_USER:-}" ]]; then
        read -rp "$(echo -e "${CYAN}请输入后台用户名 (AUTH_USER): ${NC}")" AUTH_USER
        [[ -z "$AUTH_USER" ]] && { err "AUTH_USER 不能为空"; exit 1; }
    fi
    # AUTH_PASS
    if [[ -z "${AUTH_PASS:-}" ]]; then
        read -rsp "$(echo -e "${CYAN}请输入后台密码 (AUTH_PASS): ${NC}")" AUTH_PASS
        echo ""
        [[ -z "$AUTH_PASS" ]] && { err "AUTH_PASS 不能为空"; exit 1; }
    fi

    cat > "$ENV_FILE" <<EOF
DATABASE_URL="file:./prisma/dev.db"
AUTH_USER="${AUTH_USER}"
AUTH_PASS="${AUTH_PASS}"
EOF
    chmod 600 "$ENV_FILE"
    ok ".env 已创建"
else
    info ".env 已存在，保留现有配置"
fi

info "安装 npm 依赖..."
npm install --registry="${NPM_REGISTRY}" 2>&1 | tail -3
ok "npm 依赖已安装"

info "生成 Prisma Client..."
npx prisma generate
ok "Prisma Client 已生成"

info "同步数据库..."
npx prisma db push --accept-data-loss 2>/dev/null || npx prisma db push
ok "数据库已就绪"

info "构建 Next.js..."
npm run build
ok "项目构建完成"

# ======================== 6. Playwright ========================

step "6/7 安装 Playwright Chromium"

export PLAYWRIGHT_DOWNLOAD_HOST="${PLAYWRIGHT_CDN}"

if ! grep -q "PLAYWRIGHT_DOWNLOAD_HOST" "$ENV_FILE" 2>/dev/null; then
    echo "PLAYWRIGHT_DOWNLOAD_HOST=${PLAYWRIGHT_CDN}" >> "$ENV_FILE"
fi

info "下载 Chromium..."
npx playwright install chromium 2>&1 | tail -3
ok "Chromium 已安装"

info "安装浏览器系统依赖..."
if [[ "$OS_FAMILY" == "debian" ]]; then
    npx playwright install-deps chromium 2>&1 | tail -3 || {
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq \
            libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
            libcups2 libdrm2 libdbus-1-3 libxkbcommon0 \
            libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 \
            libxrandr2 libgbm1 libpango-1.0-0 libcairo2 \
            libasound2 libwayland-client0 > /dev/null 2>&1 || true
    }
else
    npx playwright install-deps chromium 2>&1 | tail -3 || {
        yum install -y -q nss nspr atk at-spi2-atk cups-libs libdrm \
            dbus-libs libxkbcommon libXcomposite libXdamage libXfixes \
            libXrandr mesa-libgbm pango cairo alsa-lib > /dev/null 2>&1 || true
    }
fi
ok "Playwright 依赖已就绪"

# ======================== 7. PM2 + Nginx ========================

step "7/7 启动服务 (PM2 + Nginx)"

# --- PM2 ---
if ! command -v pm2 &>/dev/null; then
    info "安装 PM2..."
    npm install -g pm2 --registry="${NPM_REGISTRY}" > /dev/null 2>&1
fi
ok "PM2 $(pm2 -v)"

NODE_BIN=$(which node)
NPM_BIN=$(which npm)

mkdir -p "${DEPLOY_DIR}/logs"

cat > "${DEPLOY_DIR}/ecosystem.config.cjs" <<EOF
module.exports = {
  apps: [
    {
      name: 'drama-rank-web',
      cwd: '${DEPLOY_DIR}',
      script: '${NPM_BIN}',
      args: 'run start',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        PLAYWRIGHT_DOWNLOAD_HOST: '${PLAYWRIGHT_CDN}',
      },
      env_file: '${DEPLOY_DIR}/.env',
      max_memory_restart: '512M',
      restart_delay: 5000,
      max_restarts: 10,
      error_file: '${DEPLOY_DIR}/logs/web-error.log',
      out_file: '${DEPLOY_DIR}/logs/web-out.log',
      merge_logs: true,
    },
    {
      name: 'drama-rank-scheduler',
      cwd: '${DEPLOY_DIR}',
      script: '${NPM_BIN}',
      args: 'run scheduler',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        PLAYWRIGHT_DOWNLOAD_HOST: '${PLAYWRIGHT_CDN}',
      },
      env_file: '${DEPLOY_DIR}/.env',
      max_memory_restart: '1G',
      restart_delay: 10000,
      max_restarts: 5,
      error_file: '${DEPLOY_DIR}/logs/scheduler-error.log',
      out_file: '${DEPLOY_DIR}/logs/scheduler-out.log',
      merge_logs: true,
    }
  ]
};
EOF

pm2 delete drama-rank-web 2>/dev/null || true
pm2 delete drama-rank-scheduler 2>/dev/null || true
pm2 start "${DEPLOY_DIR}/ecosystem.config.cjs"
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null || pm2 startup 2>/dev/null || true
pm2 save
ok "PM2 进程已启动"

# --- Nginx ---
if ! command -v nginx &>/dev/null; then
    info "安装 Nginx..."
    if [[ "$OS_FAMILY" == "debian" ]]; then
        DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx > /dev/null 2>&1
    else
        yum install -y -q epel-release 2>/dev/null || true
        yum install -y -q nginx > /dev/null 2>&1
    fi
fi

if [[ "$OS_FAMILY" == "rhel" ]]; then
    NGINX_CONF="/etc/nginx/conf.d/drama-rank.conf"
else
    NGINX_CONF="/etc/nginx/sites-available/drama-rank"
fi

cat > "${NGINX_CONF}" <<'NGINXEOF'
server {
    listen 80;
    server_name _;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

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
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXEOF

if [[ "$OS_FAMILY" == "debian" ]]; then
    mkdir -p /etc/nginx/sites-available /etc/nginx/sites-enabled
    ln -sf "${NGINX_CONF}" /etc/nginx/sites-enabled/drama-rank
    rm -f /etc/nginx/sites-enabled/default
fi

nginx -t 2>&1 && ok "Nginx 配置测试通过" || warn "Nginx 配置有误，请手动检查"
systemctl enable nginx 2>/dev/null || true
systemctl restart nginx 2>/dev/null || nginx 2>/dev/null || true
ok "Nginx 已启动"

# --- 防火墙 ---
if command -v ufw &>/dev/null; then
    ufw allow 22/tcp 2>/dev/null || true
    ufw allow 80/tcp 2>/dev/null || true
    ufw allow 3000/tcp 2>/dev/null || true
    info "ufw 已放行 22/80/3000"
elif command -v firewall-cmd &>/dev/null; then
    firewall-cmd --permanent --add-port=80/tcp 2>/dev/null || true
    firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    info "firewalld 已放行 80/3000"
fi

# ======================== 完成 ========================

SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
SERVER_IP="${SERVER_IP:-localhost}"

echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║       drama-rank 部署成功!                   ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}访问地址:${NC}  http://${SERVER_IP}"
echo -e "  ${CYAN}直连端口:${NC}  http://${SERVER_IP}:3000"
echo -e "  ${CYAN}部署目录:${NC}  ${DEPLOY_DIR}"
echo -e "  ${CYAN}Node.js:${NC}   $(node -v)"
echo ""
echo -e "  ${YELLOW}常用命令:${NC}"
echo -e "    pm2 list                        查看进程"
echo -e "    pm2 logs drama-rank-web         查看 Web 日志"
echo -e "    pm2 logs drama-rank-scheduler   查看爬虫日志"
echo -e "    pm2 restart all                 重启所有服务"
echo ""
echo -e "  ${RED}提醒: 请在阿里云安全组中放行 80 端口!${NC}"
echo ""
