# StreamHub - 全球媒体监控与求片系统 🎬

<div align="center">

![StreamHub Logo](https://via.placeholder.com/200x200/4f46e5/ffffff?text=StreamHub)

**优雅、现代化的影视媒体发现与追踪平台**

连接 Emby 媒体库与全球热门影视的智能桥梁

[![Version](https://img.shields.io/badge/version-2.1.17-blue.svg)](https://github.com/huanhq99/StreamHub/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://reactjs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://hub.docker.com/)
[![Security](https://img.shields.io/badge/Security-Hardened-success.svg)](./SECURITY.md)

[功能特性](#-核心功能) • [快速开始](#-快速部署) • [配置指南](#️-配置指南) • [更新日志](#-更新日志) • [安全性](#-安全性)

</div>

---

## 🌟 核心功能

### 📺 媒体发现与管理
- **🔥 全球热门聚合** - 实时同步 Netflix, Disney+, Apple TV+ 等主流平台热门内容
- **🔍 智能全文搜索** - 电影、剧集、演员三位一体搜索，支持实时联想
- **🎭 演员中心** - 深度演员信息展示，作品列表一键直达
- **🎨 视觉盛宴** - 瀑布流/列表视图切换，响应式布局，深色模式支持

### 🔗 生态集成
- **Emby 深度集成**
  - 🏷️ 智能库存标记 - 自动比对媒体库，已入库内容清晰标识
  - ▶️ 一键播放 - 已入库影片直接跳转 Emby 播放
  - 🔄 实时同步 - 自动扫描媒体库变化

- **MoviePilot 自动化**
  - 📥 一键订阅 - 详情页直接订阅到 MoviePilot
  - 🎯 智能搜索 - 自动搜索 PT 站资源并下载
  - 👤 用户管理 - 支持自定义订阅用户名
  - 🔐 安全认证 - 支持用户名/密码或 JWT Token

### 🙋‍♂️ 求片管理系统
- **用户侧**
  - 📝 求片提交 - 浏览媒体库时一键发起求片请求
  - 🔔 状态通知 - 实时了解求片处理进度
  
- **管理侧**
  - 📊 请求面板 - 完善的后台管理界面
  - ✅ 三态管理 - 待审核/已完成/已拒绝
  - 🤖 自动通知 - Telegram/邮件/Webhook 多渠道推送

### 🛡️ 安全与稳定
- **🔒 企业级安全**
  - API Key 完全隐藏在后端
  - 所有敏感请求通过代理转发
  - 前端零暴露设计
  
- **💾 数据可靠**
  - 服务端持久化存储
  - 一键备份/恢复
  - 跨设备数据同步

## 🚀 快速部署

### 方式一：Docker 部署 (推荐 ⭐)

**最安全、最简单的部署方式**

```bash
# 1. 克隆项目
git clone https://github.com/huanhq99/StreamHub.git
cd StreamHub

# 2. 配置环境变量
cp .env.example .env
nano .env  # 填入你的 TMDB_API_KEY

# 3. 启动服务
docker-compose up -d
```

**docker-compose.yml 示例:**
```yaml
version: '3'
services:
  streamhub:
    image: ghcr.io/huanhq99/streamhub:latest
    container_name: streamhub
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data  # 数据持久化
    restart: unless-stopped
```

访问 `http://localhost:3000` 开始使用!

### 方式二：手动部署

```bash
# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 开发模式
npm run dev

# 生产构建
npm run build
node server.js
```

### 方式三：Cloudflare Pages

⚠️ **不推荐** - 无法使用后端代理功能,需要在前端配置 API Key(有安全风险)

<details>
<summary>点击查看 CF Pages 部署步骤</summary>

1. Fork 本项目到 GitHub
2. 登录 [Cloudflare Pages](https://dash.cloudflare.com/)
3. 连接 GitHub 仓库
4. 配置构建设置:
   - Framework: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
5. 部署后在设置面板中配置 TMDB API Key

</details>

## 🛠️ 配置指南

### 必需配置

1. **TMDB API Key** (必需)
   - 注册地址: https://www.themoviedb.org/settings/api
   - 配置方式: 
     - 推荐: `.env` 文件中设置 `TMDB_API_KEY`
     - 或: 前端设置面板配置

2. **管理员账号** (首次访问自动创建)
   - 设置用户名和密码
   - 用于管理求片请求和系统设置

### 可选配置

<details>
<summary>🎬 Emby 集成</summary>

设置 → 系统设置 → Emby 配置
- **服务器地址**: `http://your-emby-server:8096`
- **API Key**: 在 Emby 设置 → API 密钥中生成
- **媒体库选择**: 选择要同步的媒体库

</details>

<details>
<summary>🤖 MoviePilot 集成</summary>

设置 → 通知服务 → MoviePilot

**方式 A: 用户名密码 (推荐)**
- MoviePilot URL
- 用户名
- 密码
- (可选) 订阅用户名 - 指定订阅归属

**方式 B: JWT Token**
- 浏览器访问 MoviePilot
- F12 → Application → Local Storage
- 复制 `token` 值

</details>

<details>
<summary>📬 通知配置</summary>

支持多种通知方式:

**Telegram Bot**
- Bot Token (从 @BotFather 获取)
- Chat ID (发送消息给 @userinfobot 获取)

**邮件通知 (SMTP)**
- SMTP 服务器/端口
- 发件人邮箱/密码
- 收件人邮箱

**Webhook**
- 自定义 Webhook URL
- 支持 POST 请求推送

</details>

## 🔒 安全性

StreamHub v2.1.17+ 实施了企业级安全措施:

✅ **TMDB API Key 零暴露** - 完全存储在服务器端  
✅ **代理架构** - 所有外部 API 请求通过后端转发  
✅ **敏感信息隔离** - 前端代码中无任何硬编码密钥  
✅ **`.env` 保护** - 自动排除在版本控制之外

详细安全说明请查看: [SECURITY.md](./SECURITY.md)

### 安全检查清单

- [ ] `.env` 文件已创建并配置
- [ ] `.env` 已添加到 `.gitignore`
- [ ] 生产环境使用 HTTPS
- [ ] Emby API Key 使用受限权限账户
- [ ] 定期更换 API Keys

## 📝 更新日志

### v2.1.17 (2025-01-25) 🔒 重大安全更新

**🔐 安全增强**
- ✨ TMDB API Key 完全移至后端,前端零暴露
- ✨ 新增 `.env.example` 配置模板
- ✨ 完善的安全文档 (SECURITY.md)
- ✨ 改进 `.gitignore` 防止敏感文件泄露

**🚀 功能改进**
- ✨ MoviePilot 支持自定义订阅用户名
- ✨ 使用 MCP Tools API 提升订阅稳定性
- 📚 全面更新部署和安全文档

**⚠️ 破坏性变更**
- TMDB API Key 必须配置在后端 `.env` 文件
- 前端 `VITE_TMDB_API_KEY` 已废弃

### v2.1.16 (2025-01-25)
- 🔑 MoviePilot 支持用户名/密码自动登录
- 🔧 优化 JWT Token 获取流程

### v2.1.2 (2025-11-25)
- 🐳 更新 Docker 配置,适配新的数据路径
- 🔧 移除 `.env` 强制依赖

<details>
<summary>查看完整更新历史</summary>

### v2.1.1 (2025-11-25)
- ⚡ TMDB 连接测试新增延迟显示
- 🔧 优化配置体验

### v2.1.0 (2025-11-25)
- 🏗️ 架构升级: Node.js 后端 + 数据持久化
- 🐳 Docker 卷挂载支持
- 🔄 跨设备数据同步

### v2.0.4 (2025-11-25)
- 🐛 修复 Docker Nginx 配置错误

### v2.0.3 (2025-11-25)
- ✨ 新增版本检查功能
- 🧹 精简项目结构

### v2.0.1 (2025-11-25)
- ⚙️ 前端 TMDB 配置功能
- 🔧 MoviePilot v2 API 支持

### v2.0.0
- 🎭 演员搜索功能
- 🤖 MoviePilot 集成
- 🎨 全新 UI 设计

### v1.0.0
- 🎉 初始版本发布

</details>

## 🗺️ Roadmap

- [ ] 批量订阅功能
- [ ] 订阅历史记录
- [ ] 多语言支持 (i18n)
- [ ] 移动端 PWA 支持
- [ ] Jellyfin 集成
- [ ] Plex 集成
- [ ] 观看进度追踪

## 🤝 贡献与支持

### 贡献指南

欢迎提交 Issue 和 Pull Request!

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

### 问题反馈

- 🐛 Bug 报告: [GitHub Issues](https://github.com/huanhq99/StreamHub/issues)
- 💡 功能建议: [GitHub Discussions](https://github.com/huanhq99/StreamHub/discussions)
- 📧 安全问题: 请直接联系维护者(不要公开)

### Star History

如果这个项目对你有帮助,请给一个 ⭐️!

[![Star History Chart](https://api.star-history.com/svg?repos=huanhq99/StreamHub&type=Date)](https://star-history.com/#huanhq99/StreamHub&Date)

## 📄 许可证

本项目采用 MIT License 许可证。

## 🙏 致谢

- [TMDB](https://www.themoviedb.org/) - 媒体数据提供
- [Emby](https://emby.media/) - 媒体服务器
- [MoviePilot](https://github.com/jxxghp/MoviePilot) - 自动化订阅
- [React](https://reactjs.org/) & [Vite](https://vitejs.dev/) - 前端框架

---

<div align="center">

**[⬆️ 返回顶部](#streamhub---全球媒体监控与求片系统-)**

Made with ❤️ by [huanhq99](https://github.com/huanhq99)

</div>
