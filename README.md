# StreamHub - Global Media Monitor 📺

StreamHub 是一个优雅、现代化的影视媒体发现与追踪平台。它不仅仅是一个海报墙，更是一个连接 Emby 媒体库与全球热门影视的桥梁。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![React](https://img.shields.io/badge/React-19-61DAFB.svg)
![Vite](https://img.shields.io/badge/Vite-5.0-646CFF.svg)

## ✨ 核心亮点

*   **🔥 全球热门聚合**: 实时同步 Netflix, Disney+, Apple TV+ 等主流平台的最新热门电影与剧集。
*   **🔗 Emby 深度集成**: 
    *   **智能比对**: 自动扫描您的 Emby 媒体库，在海报上标记 "已入库"，避免重复下载。
    *   **一键跳转**: 已有的影片可直接跳转 Emby 客户端播放。
*   **🙋‍♂️ 求片管理系统**: 
    *   **用户点播**: 用户可浏览并提交 "求片" 请求。
    *   **管理员审核**: 完善的后台管理面板，支持审核、拒绝、标记完成。
    *   **即时通知**: 支持 Telegram Bot 推送，新请求和入库通知秒级触达。
*   **🎨 极致 UI/UX**:
    *   **类原生体验**: 丝滑的动画、骨架屏加载、响应式布局。
    *   **个性化定制**: 支持深色模式、自定义网站标题与 Logo。
    *   **系列与推荐**: 详情页自动聚合 "系列合集" 和 "猜你喜欢"。
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
      - VITE_TMDB_API_KEY=your_key_here
    restart: unless-stopped
```

## 🛠️ 管理员指南

### 首次设置
1. 首次访问会自动跳转初始化页面，设置管理员账号。
2. 进入设置面板 (`Settings`) -> `系统设置`，配置您的 Emby 地址和 API Key。
3. (可选) 配置 Telegram Bot 以获取通知。

### 功能清单
- [x] 瀑布流/列表视图切换
- [x] 多维度筛选 (平台/年份/地区)
- [x] 搜索与联想
- [x] 详情页 (预告片/演员/推荐)
- [x] Emby 库同步
- [x] 求片系统
- [x] 用户管理 (多用户支持)
- [x] 数据备份与恢复

## 🤝 贡献与反馈

欢迎提交 Issue 或 Pull Request。如果您觉得本项目对您有帮助，请给一个 ⭐️ Star！

## 📄 许可证

MIT License © 2024 StreamHub
