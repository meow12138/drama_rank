# 海外短剧爆款监控 — 部署指南

## 环境要求

- **海外服务器**（推荐 AWS、Vultr、Linode 等，位于美国/欧洲）
- **Docker + Docker Compose**
- **域名**（可选，可直接用 IP 访问）

## 快速部署

### 1. 连接服务器并上传代码

```bash
# 在服务器上克隆或上传代码
cd /opt
git clone <你的仓库地址> drama-rank
cd drama-rank
```

### 2. 执行一键部署脚本

```bash
chmod +x deploy.sh
./deploy.sh
```

脚本会自动完成：
- 构建 Docker 镜像
- 启动容器
- 等待服务就绪
- 运行首次数据同步

### 3. 手动部署（不用脚本）

```bash
# 构建并启动
docker compose up -d --build

# 查看日志
docker compose logs -f

# 首次同步数据
docker compose exec drama-rank npx tsx src/scripts/scraper.ts
```

### 4. 设置定时同步

使用 `crontab` 每天自动更新数据：

```bash
crontab -e
```

添加以下内容（每天凌晨 3 点同步）：

```
0 3 * * * cd /opt/drama-rank && docker compose exec -T drama-rank npx tsx src/scripts/scraper.ts >> /var/log/drama-sync.log 2>&1
```

## 常用命令

| 命令 | 说明 |
|------|------|
| `docker compose up -d` | 后台启动服务 |
| `docker compose down` | 停止服务 |
| `docker compose logs -f` | 查看实时日志 |
| `docker compose exec drama-rank npx tsx src/scripts/scraper.ts` | 手动运行爬虫 |
| `docker compose exec drama-rank npx tsx src/scripts/seed.ts` | 重新填充种子数据 |

## 目录结构

```
drama-rank/
├── data/           # 数据库文件挂载点（持久化）
├── src/
│   ├── app/        # Next.js 前端页面
│   ├── scripts/
│   │   ├── scraper.ts   # Playwright 爬虫
│   │   └── seed.ts      # 种子数据
│   └── lib/
│       └── db.ts        # Prisma 客户端
├── prisma/
│   └── schema.prisma    # 数据库模型
├── Dockerfile
├── docker-compose.yml
└── deploy.sh
```

## 注意事项

1. **必须使用海外服务器**：ReelShort、ShortTV 等平台在中国大陆无法直接访问，且 CloudFront 会拦截部分请求。
2. **Playwright 内存占用**：爬虫需要约 1-2GB 内存，建议服务器配置至少 2GB RAM。
3. **数据持久化**：数据库文件挂载在 `./data` 目录，升级时不会丢失数据。
