# Docker 部署指南

## 🐳 快速开始

### 方式 1: Docker Compose (推荐)

**1. 克隆项目**
```bash
git clone https://github.com/huanhq99/StreamHub.git
cd StreamHub
```

**2. 首次启动 (自动生成配置)**
```bash
docker-compose up -d
```

服务器会自动在 `./data` 目录下生成默认的 `config.json`

**3. 查看日志确认配置生成**
```bash
docker-compose logs -f
```

你会看到:
```
🔧 首次运行检测到，正在生成默认配置文件...
✅ 已生成默认配置文件: config.json
📝 请编辑 config.json 填入您的配置信息
```

**4. 停止容器，编辑配置**
```bash
docker-compose down
nano config.json  # 或使用你喜欢的编辑器
```

编辑 `config.json`:
```json
{
  "tmdb": {
    "apiKey": "你的TMDB_API_Key"
  }
}
```

**5. 重启容器**
```bash
docker-compose up -d
```

**6. 访问应用**
```
http://localhost:3000
```

---

## 📝 完整配置示例

### docker-compose.yml

```yaml
version: "3"
services:
  streamhub:
    image: ghcr.io/huanhq99/streamhub:latest
    container_name: streamhub
    ports:
      - "3007:3000"  # 外部端口:内部端口
    
    volumes:
      - ./data:/app/data              # 数据持久化
      - ./config.json:/app/config.json # 配置文件
    
    restart: unless-stopped
```

### config.json (完整配置)

```json
{
  "tmdb": {
    "apiKey": "你的TMDB_API_Key",
    "baseUrl": "https://api.themoviedb.org/3"
  },
  "emby": {
    "serverUrl": "http://192.168.1.100:8096",
    "apiKey": "你的Emby_API_Key"
  },
  "moviepilot": {
    "url": "https://your-moviepilot.com",
    "username": "admin",
    "password": "your_password",
    "subscribeUser": "hub"
  },
  "server": {
    "port": 3000,
    "dataDir": "./data"
  },
  "proxy": {
    "http": "",
    "https": ""
  }
}
```

---

## 🔧 高级配置

### 使用环境变量 (可选)

如果你更喜欢环境变量而不是 config.json:

```yaml
version: "3"
services:
  streamhub:
    image: ghcr.io/huanhq99/streamhub:latest
    container_name: streamhub
    ports:
      - "3000:3000"
    environment:
      - TMDB_API_KEY=your_api_key_here
      - PORT=3000
      - DATA_DIR=/app/data
      # 代理设置 (可选)
      - HTTP_PROXY=http://host.docker.internal:7890
      - HTTPS_PROXY=http://host.docker.internal:7890
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

**注意**: `config.json` 优先级高于环境变量!

---

## 🚀 常用命令

### 启动服务
```bash
docker-compose up -d
```

### 停止服务
```bash
docker-compose down
```

### 查看日志
```bash
docker-compose logs -f
```

### 重启服务
```bash
docker-compose restart
```

### 查看运行状态
```bash
docker-compose ps
```

### 更新到最新版本
```bash
docker-compose pull
docker-compose up -d
```

### 进入容器
```bash
docker-compose exec streamhub sh
```

---

## 📂 目录结构

```
StreamHub/
├── docker-compose.yml      # Docker Compose 配置
├── config.json            # 配置文件 (首次运行自动生成)
└── data/                  # 数据目录 (自动创建)
    └── db.json           # 数据库文件
```

---

## 🔍 故障排查

### 问题 1: 容器启动失败

**检查日志:**
```bash
docker-compose logs streamhub
```

**常见原因:**
- 端口被占用 → 修改 `docker-compose.yml` 中的端口
- 配置文件格式错误 → 检查 `config.json` 语法

### 问题 2: 配置文件未生效

**确认挂载:**
```bash
docker-compose exec streamhub ls -la /app/config.json
```

**重新生成配置:**
```bash
docker-compose down
rm config.json
docker-compose up -d
```

### 问题 3: 无法访问 Emby/MoviePilot

如果 Emby/MoviePilot 运行在宿主机:
- 使用 `host.docker.internal` 而不是 `localhost`
- 例如: `http://host.docker.internal:8096`

如果在其他容器:
- 使用 Docker 网络连接
- 或使用宿主机 IP 地址

---

## 🔐 安全建议

### 1. 使用 Docker Secrets (生产环境)

创建 `docker-compose.prod.yml`:
```yaml
version: "3.8"
services:
  streamhub:
    image: ghcr.io/huanhq99/streamhub:latest
    secrets:
      - config
    volumes:
      - ./data:/app/data
    restart: unless-stopped

secrets:
  config:
    file: ./config.json
```

### 2. 限制容器权限

```yaml
services:
  streamhub:
    # ... 其他配置
    user: "1000:1000"  # 非 root 用户
    read_only: true     # 只读文件系统
    security_opt:
      - no-new-privileges:true
    volumes:
      - ./data:/app/data:rw  # 只有 data 可写
```

### 3. 反向代理 (推荐)

使用 Nginx/Traefik 添加 HTTPS:

```yaml
services:
  streamhub:
    # ... 其他配置
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.streamhub.rule=Host(`streamhub.yourdomain.com`)"
      - "traefik.http.routers.streamhub.tls=true"
      - "traefik.http.routers.streamhub.tls.certresolver=letsencrypt"
```

---

## 📊 监控和维护

### 健康检查

添加到 `docker-compose.yml`:
```yaml
services:
  streamhub:
    # ... 其他配置
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

### 资源限制

```yaml
services:
  streamhub:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

### 日志管理

```yaml
services:
  streamhub:
    # ... 其他配置
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

---

## 🔄 更新策略

### 自动更新 (Watchtower)

```yaml
version: "3"
services:
  streamhub:
    # ... StreamHub 配置
  
  watchtower:
    image: containrrr/watchtower
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    command: --interval 86400 streamhub
```

### 手动更新

```bash
# 1. 备份数据
cp -r data data.backup

# 2. 拉取最新镜像
docker-compose pull

# 3. 重启容器
docker-compose up -d

# 4. 查看日志确认
docker-compose logs -f
```

---

## 🌐 多实例部署

运行多个实例 (不同端口):

**实例 1:**
```yaml
# docker-compose.prod.yml
services:
  streamhub-prod:
    image: ghcr.io/huanhq99/streamhub:latest
    ports:
      - "3007:3000"
    volumes:
      - ./data-prod:/app/data
      - ./config-prod.json:/app/config.json
```

**实例 2:**
```yaml
# docker-compose.dev.yml
services:
  streamhub-dev:
    image: ghcr.io/huanhq99/streamhub:latest
    ports:
      - "3008:3000"
    volumes:
      - ./data-dev:/app/data
      - ./config-dev.json:/app/config.json
```

启动:
```bash
docker-compose -f docker-compose.prod.yml up -d
docker-compose -f docker-compose.dev.yml up -d
```

---

## 📚 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [项目 README](../README.md)
- [配置指南](../CONFIG.md)
- [安全文档](../SECURITY.md)

---

## 🆘 需要帮助?

- 📖 查看项目文档
- 🐛 [提交 Issue](https://github.com/huanhq99/StreamHub/issues)
- 💬 查看已有的问题和解决方案
