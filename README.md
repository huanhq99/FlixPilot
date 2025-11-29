# StreamHub

<p align="center">
  <img src="public/images/illustrations/objects/streamhub-logo.png" alt="StreamHub Logo" width="128" />
</p>

<p align="center">
  <strong>🎬 Emby/Jellyfin 媒体服务器管理面板</strong>
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#docker-部署">Docker 部署</a> •
  <a href="#配置说明">配置说明</a> •
  <a href="#技术栈">技术栈</a>
</p>

---

## ✨ 功能特性

### 🖥️ 服务器管理
- **实时监控** - 实时查看服务器播放状态、在线用户
- **播放历史** - 完整的播放记录和统计分析
- **播放排行** - 热门内容排行榜
- **设备管理** - 管理已连接的客户端设备

### 👥 用户管理
- **用户管理** - 批量管理 Emby/Jellyfin 用户
- **用户活动** - 追踪用户观看行为
- **卡密系统** - 生成注册/续费卡密
- **Telegram 绑定** - 支持 Telegram 机器人通知

### 🎬 媒体管理
- **媒体请求** - 用户可提交想看的影视请求
- **TMDB 集成** - 自动获取影视元数据
- **趋势榜单** - 展示 TMDB 热门内容

### 📢 运营功能
- **公告系统** - 发布站点公告
- **工单系统** - 用户反馈与支持
- **知识库** - 常见问题解答

### ⚙️ 系统设置
- **多媒体服务器** - 支持同时管理多个 Emby/Jellyfin 服务器
- **邮件通知** - SMTP 邮件通知配置
- **Telegram 通知** - 机器人消息推送
- **授权管理** - 功能授权验证

---

## 🚀 快速开始

### 环境要求

- Node.js 20+
- pnpm（推荐）或 npm
- Redis（可选，用于缓存）

### 本地开发

```bash
# 克隆项目
git clone https://github.com/huanhq99/streamhub.git
cd streamhub

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:3005

### 构建生产版本

```bash
pnpm build
pnpm start
```

---

## 🐳 Docker 部署

### 使用 Docker Compose（推荐）

1. 创建项目目录：

```bash
mkdir streamhub && cd streamhub
```

2. 创建 `docker-compose.yml`：

```yaml
services:
  streamhub:
    image: ghcr.io/huanhq99/streamhub:latest
    container_name: streamhub
    restart: unless-stopped
    ports:
      - "3005:3005"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - DATA_DIR=/app/data
      - TZ=Asia/Shanghai
      - REDIS_URL=redis://redis:6379
      - LICENSE_SERVER=https://license.aelita.me
    depends_on:
      redis:
        condition: service_healthy

  redis:
    image: redis:7-alpine
    container_name: streamhub-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --maxmemory 128mb --maxmemory-policy allkeys-lru
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data:
```

3. 启动服务：

```bash
docker compose up -d
```

4. 访问 http://your-server:3005

### 初始账号

首次启动后，使用以下默认账号登录：

- **用户名**: `admin`
- **密码**: `admin123`

> ⚠️ **请在首次登录后立即修改密码！**

---

## ⚙️ 配置说明

### 数据目录结构

```
data/
├── config.json          # 主配置文件
├── users.json           # 用户数据
├── cards.json           # 卡密数据
├── tickets.json         # 工单数据
├── announcements.json   # 公告数据
├── knowledge.json       # 知识库
├── media-requests.json  # 媒体请求
├── play-history.json    # 播放历史
└── device-config.json   # 设备配置
```

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NODE_ENV` | 运行环境 | `production` |
| `DATA_DIR` | 数据目录路径 | `/app/data` |
| `TZ` | 时区 | `Asia/Shanghai` |
| `REDIS_URL` | Redis 连接地址 | - |
| `LICENSE_SERVER` | 授权服务器地址 | - |
| `JWT_SECRET` | JWT 密钥（建议设置） | 随机生成 |

### 配置文件示例

参考 `data/config.example.json` 创建你的配置文件。

---

## 🔧 技术栈

- **框架**: [Next.js 16](https://nextjs.org/) + React 18
- **UI**: [Material UI 6](https://mui.com/)
- **样式**: Tailwind CSS + Emotion
- **语言**: TypeScript
- **缓存**: Redis
- **容器**: Docker

---

## 📸 截图预览

<details>
<summary>点击展开截图</summary>

### 仪表盘
![Dashboard](docs/screenshots/dashboard.png)

### 播放监控
![Play Monitor](docs/screenshots/play-monitor.png)

### 用户管理
![User Management](docs/screenshots/user-manage.png)

</details>

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

[MIT License](LICENSE)

---

## 🙏 致谢

- [Emby](https://emby.media/)
- [Jellyfin](https://jellyfin.org/)
- [TMDB](https://www.themoviedb.org/)
- [Next.js](https://nextjs.org/)
- [Material UI](https://mui.com/)
