# StreamHub - 全球媒体监控与求片系统 🎬

<div align="center">

![StreamHub Logo](https://via.placeholder.com/200x200/4f46e5/ffffff?text=StreamHub)

**优雅、现代化的影视媒体发现与追踪平台**

连接 Emby 媒体库与全球热门影视的智能桥梁

[![Version](https://img.shields.io/badge/version-2.2.0-blue.svg)](https://github.com/huanhq99/StreamHub/releases)
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

### 📊 观影统计与报告 (NEW!)
- **📺 实时观看** - 卡片式 UI 展示当前观看会话
  - 海报 + 模糊背景布局
  - 显示设备、客户端、进度信息
  - 支持点击跳转 Emby 播放
- **🖼️ 精美图片报告** - 类似 Emby 排行榜风格的图片报告
  - 电影/剧集 Top 12 双栏排行
  - 自动获取热门影视海报作为背景
  - 显示播放时长和次数统计
- **⏰ 定时推送** - 每日/每周自动推送到 Telegram
- **📈 实时统计** - 活跃用户、播放次数、观看时长

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

# 2. 首次启动 (自动生成 config.json)
docker-compose up -d

# 3. 停止容器，编辑配置
docker-compose down
nano config.json  # 填入你的 TMDB API Key

# 4. 重启容器
docker-compose up -d
```

📚 **详细 Docker 部署指南**: [DOCKER.md](DOCKER.md)

访问 `http://localhost:3000` 开始使用!

### 方式二：手动部署

```bash
# 1. 安装依赖
npm install

# 2. 配置 (二选一)
# 方式 A: 使用 config.json (推荐 ✨)
cp config.example.json config.json
nano config.json  # 编辑配置文件

# 方式 B: 使用 .env (传统方式)
cp .env.example .env
nano .env  # 编辑环境变量

# 3. 开发模式
npm run dev

# 4. 生产构建
npm run build
node server.js
```

**配置文件优先级**: `config.json` > `.env` > 默认值

📚 详细配置说明请查看 [CONFIG.md](CONFIG.md)

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

## ⚙️ 配置指南

### 必需配置

1. **TMDB API Key** (必需 🔑)
   - 获取地址: https://www.themoviedb.org/settings/api
   - 配置方式 (三选一):
     - ✨ 推荐: `config.json` 文件中设置
     - 📝 传统: `.env` 文件中设置 `TMDB_API_KEY`
     - ⚙️ 手动: 前端设置面板配置 (不推荐,有安全风险)

2. **管理员账号** (首次访问自动创建)
   - 设置用户名和密码
   - 用于管理求片请求和系统设置

📚 **详细配置说明**: 请查看 [CONFIG.md](CONFIG.md) 获取完整的配置文档

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

StreamHub v2.1.31+ 实施了企业级安全措施:

✅ **TMDB API Key 零暴露** - 完全存储在服务器端  
✅ **代理架构** - 所有外部 API 请求通过后端转发  
✅ **敏感信息隔离** - 前端代码中无任何硬编码密钥  
✅ **`.env` 保护** - 自动排除在版本控制之外

详细安全说明请查看: [SECURITY.md](./SECURITY.md)

### 安全检查清单

- [ ] 配置文件已创建 (`config.json` 或 `.env`)
- [ ] 配置文件已添加到 `.gitignore` ✅ (已自动配置)
- [ ] 生产环境使用 HTTPS
- [ ] Emby API Key 使用受限权限账户
- [ ] 定期更换 API Keys

## 📝 更新日志

### v2.2.0 (2025-11-26) 🤖 Telegram 机器人求片系统

**✨ 新功能**
- 🤖 **TG 机器人交互式求片**
  - `/签到` - 每日签到领取爆米花 🍿
  - `/余额` - 查看爆米花和求片额度
  - `/兑换` - 用爆米花兑换求片额度
  - `/求片 <片名>` - 搜索并提交求片请求
- 🍿 **爆米花积分系统**
  - 每日签到奖励（默认 10 爆米花）
  - 积分兑换求片额度（默认 50:1）
  - 新用户默认求片额度（默认 3 次）
- 👮 **管理员功能**
  - 收到求片请求自动通知
  - 一键标记完成/拒绝
  - 用户自动收到状态更新
- 🔐 **多用户认证系统**
  - 支持管理员密码登录
  - 支持 Emby 账户登录
  - 支持游客浏览模式

**📝 配置说明 (config.json)**
```json
{
  "bot": {
    "defaultQuota": 3,
    "checkinReward": 10,
    "exchangeRate": 50,
    "adminUsers": ["你的TG用户ID"]
  }
}
```

**⚙️ 设置 Webhook**
```
https://你的域名/api/telegram/webhook
```

### v2.1.31 (2025-11-25) 📊 观影报告系统

**✨ 新功能**
- 📺 **实时观看** - 卡片式 UI 展示当前观看会话
  - 海报 + 模糊背景布局
  - 显示设备、客户端、播放进度
  - 点击跳转 Emby 播放
- 🖼️ **图片报告生成** - 类似 Emby 排行榜风格的精美报告
  - 电影/剧集 Top 12 双栏排行
  - 自动获取 TMDB 热门影视海报作为背景
  - 显示播放时长和次数统计
- ⏰ **定时推送** - 每日/每周自动推送到 Telegram
- 🔧 **报告 API** - 支持手动触发生成报告
  - `GET /api/report/status` - 查看报告配置状态
  - `POST /api/report/generate` - 手动生成报告

**🐛 修复**
- 修复设置面板 Telegram 配置显示问题
- 修复 Docker 构建 canvas 依赖 (添加中文字体支持)
- 修复报告弹窗 TG 推送配置同步

**📝 配置说明 (config.json)**
```json
{
  "telegram": {
    "botToken": "你的Bot Token",
    "chatId": "你的Chat ID"
  },
  "report": {
    "enabled": true,
    "dailyTime": "23:00",
    "weeklyDay": 0,
    "weeklyTime": "22:00"
  }
}
```

### v2.1.18 (2025-01-25) 📦 配置系统优化

**✨ 新功能**
- ✨ 新增 `config.json` 配置方式 (推荐)
- ✨ JSON 格式更清晰,支持结构化配置
- ✨ 配置优先级: config.json > .env > 默认值
- 📚 新增完整配置文档 [CONFIG.md](CONFIG.md)

**🔧 改进**
- 🎨 美化服务器启动日志
- 📝 更新 README 配置说明
- 🔒 config.json 已加入 .gitignore

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
- TMDB API Key 必须配置在后端 `.env` 或 `config.json` 文件
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

- [x] ~~观影统计报告~~ ✅ v2.1.31
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
