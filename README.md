# StreamHub - Global Media Monitor

StreamHub 是一个现代化的影视媒体发现与追踪仪表盘，基于 React 和 Tailwind CSS 构建。它聚合了全球主流流媒体平台（Netflix, Disney+, Apple TV+ 等）的热门内容，提供优雅的浏览体验。

## ✨ 功能特性

- 🎬 **海量影视库**：基于 TMDB API，覆盖全球电影和剧集。
- 🔍 **多维筛选**：支持按地区（华语、欧美、日韩等）、流媒体平台、类型、年份筛选。
- 📱 **响应式设计**：完美适配桌面端、平板和移动端设备。
- 🌗 **深色模式**：自动适配系统主题，支持手动切换。
- 🚀 **Docker 部署**：提供 Docker 镜像和 Compose 文件，一键部署。
- ⚡ **高性能**：基于 Vite 构建，秒级加载。

## 🛠️ 技术栈

- **前端框架**: React 19
- **构建工具**: Vite
- **语言**: TypeScript
- **样式**: Tailwind CSS
- **图标**: Lucide React
- **数据源**: The Movie Database (TMDB)

## ☁️ Cloudflare Pages 一键部署 (小白推荐)

无需服务器，免费部署，自动解决国内访问 TMDB API 的网络问题。

1. **Fork 本项目**：点击右上角的 `Fork` 按钮，将项目复制到你的 GitHub 账号。
2. **登录 Cloudflare**：进入 [Cloudflare Dashboard](https://dash.cloudflare.com/)，选择 `Workers & Pages` -> `Create Application` -> `Pages` -> `Connect to Git`。
3. **选择仓库**：选择你刚才 Fork 的 `StreamHub` 仓库。
4. **配置构建设置**：
   - **Framework preset**: 选择 `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. **设置环境变量** (Environment variables)：
   - `VITE_TMDB_API_KEY`: 你的 TMDB API Key
   - `VITE_TMDB_API_URL`: `/api` (设置为 `/api` 以启用 Cloudflare 代理功能)
6. **点击部署** (Save and Deploy)。

部署完成后，Cloudflare 会自动为你分配一个 `*.pages.dev` 的域名，即可直接访问！

## 🐳 Docker 部署 (VPS)

使用 Docker Compose 可以快速启动服务。

1. 创建 `docker-compose.yml` 文件：

```yaml
services:
  streamhub:
    image: ghcr.io/huanhq99/streamhub:latest
    container_name: streamhub
    ports:
      - "3000:3000"
    environment:
      - TMDB_API_KEY=your_tmdb_api_key_here
      - TMDB_API_URL=https://api.themoviedb.org/3
      # 如果需要代理，取消注释以下行
      # - HTTP_PROXY=http://proxy:7890
      # - HTTPS_PROXY=http://proxy:7890
    restart: always
```

2. 启动服务：

```bash
docker-compose up -d
```

访问 `http://localhost:3000` 即可使用。

## 💻 本地开发

1. 克隆项目：

```bash
git clone https://github.com/huanhq99/StreamHub.git
cd StreamHub
```

2. 安装依赖：

```bash
npm install
```

3. 配置环境变量：

复制 `.env.local` 示例并填入您的 TMDB API Key。

```bash
echo "VITE_TMDB_API_KEY=your_key_here" > .env.local
```

4. 启动开发服务器：

```bash
npm run dev
```

## ⚙️ 环境变量配置

| 变量名 | 描述 | 默认值 |
| :--- | :--- | :--- |
| `TMDB_API_KEY` | TMDB API 密钥 (必填) | - |
| `TMDB_API_URL` | TMDB API 地址 (可用于反代) | `https://api.themoviedb.org/3` |
| `TMDB_IMAGE_URL` | 图片 CDN 地址 (可选) | `https://image.tmdb.org/t/p` |

## 📄 许可证

MIT License
