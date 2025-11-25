# StreamHub - Global Media Monitor 📺

StreamHub 是一个优雅、现代化的影视媒体发现与追踪平台。它不仅仅是一个海报墙，更是一个连接 Emby 媒体库与全球热门影视的桥梁。

![Version](https://img.shields.io/badge/version-2.0.4-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF.svg)

## ✨ 核心亮点

*   **🔥 全球热门聚合**: 实时同步 Netflix, Disney+, Apple TV+ 等主流平台的最新热门电影与剧集。
*   **🔍 智能搜索**: 
    *   **媒体搜索**: 支持电影、剧集搜索，实时联想提示。
    *   **演员搜索**: 新增演员搜索功能，可查看演员详细信息及作品列表。
    *   **无缝导航**: 从演员详情页可直接跳转到其作品详情，完整浏览体验。
*   **🔗 Emby 深度集成**: 
    *   **智能比对**: 自动扫描您的 Emby 媒体库，在海报上标记 "已入库"，避免重复下载。
    *   **一键跳转**: 已有的影片可直接跳转 Emby 客户端播放。
*   **🎬 MoviePilot 自动订阅**: 
    *   **PT 站自动搜索**: 集成 MoviePilot API，支持自动订阅并搜索 PT 站资源。
    *   **一键订阅**: 在详情页直接订阅到 MoviePilot，自动触发下载流程。
    *   **灵活配置**: 支持多种认证方式（Bearer Token、API Key、Query 参数）。
*   **🙋‍♂️ 求片管理系统**: 
    *   **用户点播**: 用户可浏览并提交 "求片" 请求。
    *   **管理员审核**: 完善的后台管理面板，支持审核、拒绝、标记完成。
    *   **即时通知**: 支持 Telegram Bot 推送，新请求和入库通知秒级触达。
*   **🎨 极致 UI/UX**:
    *   **类原生体验**: 丝滑的动画、骨架屏加载、响应式布局。
    *   **个性化定制**: 支持深色模式、自定义网站标题与 Logo。
    *   **系列与推荐**: 详情页自动聚合 "系列合集" 和 "猜你喜欢"。
    *   **版本标识**: 设置界面和页面头部显示版本号，方便区分不同版本。
*   **🛡️ 安全与稳定**:
    *   **纯前端架构**: 无需数据库，数据存储于本地 (LocalStorage)，安全隐私。
    *   **数据备份**: 支持一键导出/导入所有配置数据。
    *   **错误拦截**: 全局 Error Boundary 保护，杜绝白屏。

## 🚀 快速部署

### 方式一：Cloudflare Pages (小白推荐 ☁️)

无需服务器，零成本，自动解决 API 网络问题。

1. **Fork** 本项目到你的 GitHub。
2. 登录 [Cloudflare Pages](https://dash.cloudflare.com/) -> `Create Application` -> `Connect to Git`。
3. 选择仓库，配置如下：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variables**:
     - `VITE_TMDB_API_KEY`: 您的 TMDB API Key
     - `VITE_TMDB_API_URL`: `/api` (启用 CF 代理)
4. 点击 **Deploy**，即可获得免费域名访问。

### 方式二：Docker 部署 (VPS 🐳)

适合有自己服务器的进阶用户。

```yaml
version: '3'
services:
  streamhub:
    image: ghcr.io/huanhq99/streamhub:latest
    container_name: streamhub
    ports:
      - "3000:3000"
    environment:
      - TMDB_API_KEY=your_key_here
      - HTTP_PROXY=http://127.0.0.1:7890  # 可选：代理设置
      - HTTPS_PROXY=http://127.0.0.1:7890  # 可选：代理设置
    volumes:
      - ./config:/app/backend/config  # 配置文件持久化
      - ./data:/app/backend/data       # 数据文件持久化
    restart: unless-stopped
```

**注意事项**:
- 端口固定为 `3000`，可通过 Nginx 反向代理到其他端口
- 配置文件和数据会自动持久化到本地 `config` 和 `data` 目录
- 支持代理环境变量，方便国内用户访问 TMDB API

## 🛠️ 管理员指南

### 首次设置
1. 首次访问会自动跳转初始化页面，设置管理员账号。
2. 进入设置面板 (`Settings`) -> `系统设置`，配置您的 Emby 地址和 API Key。
3. (可选) 配置 Telegram Bot 以获取通知。
4. (可选) 配置 MoviePilot：
   - 进入 `设置` -> `通知服务` 标签页
   - 填写 MoviePilot URL 和 API Token
   - 支持多种认证方式，系统会自动尝试

### 功能清单
- [x] 瀑布流/列表视图切换
- [x] 多维度筛选 (平台/年份/地区)
- [x] 媒体搜索与联想
- [x] **演员搜索** (v2.0.0 新增)
- [x] 详情页 (预告片/演员/推荐)
- [x] Emby 库同步
- [x] **MoviePilot 自动订阅** (v2.0.0 新增)
- [x] 求片系统
- [x] 用户管理 (多用户支持)
- [x] 数据备份与恢复
- [x] **版本号显示** (v2.0.0 新增)
- [x] **TMDB 前端配置** (v2.0.1 新增)

## 📝 更新日志

### v2.0.4 (2025-11-25)
- **修复**: 修复 Docker 镜像中 Nginx 配置指向不存在的后端导致 502 错误的问题。
- **优化**: 移除 Docker Compose 中无用的后端卷挂载。

### v2.0.3 (2025-11-25)
- **新增**: 设置面板新增 "检查更新" 功能，可一键检测 GitHub 最新版本。
- **优化**: 移除冗余的后端代理文件，精简项目结构。

### v2.0.1 (2025-11-25)
- **新增**: 设置面板新增 TMDB 配置功能，支持直接在前端配置 API Key 和 代理地址。
- **优化**: TMDB 连接测试功能，配置保存即生效。
- **修复**: 修复了 MoviePilot 连接认证问题，支持 v2 API Key。

### v2.0.0
- **新增**: 演员搜索功能。
- **新增**: MoviePilot 自动订阅集成。
- **重构**: 全新 UI 设计。

### v1.0.0
- 🎉 初始版本发布
- 基础媒体浏览和搜索功能
- Emby 集成
- 求片管理系统
- Telegram 通知

## 🤝 贡献与反馈

欢迎提交 Issue 或 Pull Request。如果您觉得本项目对您有帮助，请给一个 ⭐️ Star！

## 📄 许可证

MIT License © 2024 StreamHub
