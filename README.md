<p align="center">
  <img src="public/branding/readme-hero.svg" alt="FlixPilot · 视界 - Emby 站长的一体化运营面板" width="880" />
</p>

<p align="center">
  <strong>一个面板，把 Emby 站长每天最烦的事接住。</strong><br/>
  <sub>Go API + Caddy/Vite 前端的一体化镜像，把求片、追剧、缺集、播放风控、会员积分、通知模板、Telegram Bot、AI Agent 和 115 联动收进同一个工作台。</sub>
</p>

<p align="center">
  <a href="https://github.com/huanhq99/FlixPilot/stargazers"><img src="https://img.shields.io/github/stars/huanhq99/FlixPilot?style=for-the-badge&logo=github&label=Stars&color=0b84a5" alt="stars"></a>
  <a href="https://hub.docker.com/r/huanhq99/flixpilot"><img src="https://img.shields.io/docker/pulls/huanhq99/flixpilot?style=for-the-badge&logo=docker&color=0b84a5&label=Pulls" alt="docker pulls"></a>
  <a href="https://hub.docker.com/r/huanhq99/flixpilot"><img src="https://img.shields.io/docker/v/huanhq99/flixpilot?style=for-the-badge&logo=docker&label=Version&color=f59e0b" alt="version"></a>
  <a href="https://t.me/EmbyCockpit"><img src="https://img.shields.io/badge/Telegram-交流群-229ed9?style=for-the-badge&logo=telegram" alt="Telegram"></a>
</p>

<p align="center">
  <a href="#-这是什么">这是什么</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-核心特性">核心特性</a> ·
  <a href="#-主要界面">主要界面</a> ·
  <a href="#-docker-部署">部署</a> ·
  <a href="#-常见问题">FAQ</a> ·
  <a href="https://t.me/EmbyCockpit">加入交流群</a>
</p>

<table>
  <tr>
    <td align="center" width="33%">
      <strong>站长少切后台</strong><br/>
      <sub>用户、会员、设备、播放、通知集中处理</sub>
    </td>
    <td align="center" width="33%">
      <strong>用户少问进度</strong><br/>
      <sub>自助查片、求片、追剧、看入库状态</sub>
    </td>
    <td align="center" width="33%">
      <strong>自动化少重复</strong><br/>
      <sub>MoviePilot、115、Telegram、AI Agent 串成工作流</sub>
    </td>
  </tr>
</table>

---

## 💡 这是什么？

**FlixPilot 是 Emby 站点的运营驾驶舱。** 它不替代播放器，而是把播放器背后的运营工作补齐：用户管理、求片审批、追剧缺集、资源搜索、MoviePilot 订阅、Emby 入库通知、会员到期、账号风控和播放排行，都在一个面板里完成。

当前仓库是 **FlixPilot-Go**：前端由 Vite 构建成静态文件，生产环境由 `huanhq99/flixpilot` 单个应用镜像同时运行 Caddy 和 Go API。Caddy 对外提供 `3005` 并把 `/api/*` 转发到容器内的 Go 服务；Go 服务还负责 Emby 反代网关端口段。Docker Compose 默认只运行 FlixPilot 应用和 Redis，API 的 `8080` 无需映射到宿主机。

<table>
  <tr>
    <td width="50%" valign="top">

**它适合这些场景**

- 你在维护一个家庭影院、朋友共享服或中小型 Emby 站点
- 你需要处理求片、追剧、会员、卡密、邀请码、设备限制、播放监控、入库频道和通知模板
- 你想把 MoviePilot、115、Telegram、TMDB、AI Agent 等工具串起来
- 你希望用 Docker 快速部署，并通过 Web 初始化和设置页完成大部分配置

</td>
    <td width="50%" valign="top">

**它不适合这些场景**

- 你只想找片源，但没有自己的媒体库
- 你不打算部署 Docker / VPS / NAS 环境
- 你希望它替代 Emby 本体播放器

</td>
  </tr>
</table>

> 说明：FlixPilot 围绕 Emby API、Emby Webhook、Playback Reporting 和 Emby 用户/设备数据设计；如果你的站点不是 Emby，部分核心能力不会完整可用。

## 🚀 快速开始

```bash
# 建议新建一个空目录保存 compose 和 data
mkdir -p flixpilot && cd flixpilot

# 下载 docker-compose.yml
curl -O https://raw.githubusercontent.com/huanhq99/FlixPilot/main/docker-compose.yml

# 启动
docker compose up -d

# 浏览器访问 http://你的IP:3005
# 首次进入会自动跳转初始化向导
```

升级前建议先备份 `data/` 目录。最近更新：v2.5.9（版本日志随镜像发布）。

## ✨ 核心特性

一句话：把 Emby 站点运营从“人肉处理”变成“流程闭环”。

|  | 场景 | FlixPilot 做什么 | 结果 |
|---|------|------------------|------|
| 🎬 | **自助找片** | 发现、详情、播放、收藏、片单 | 用户少问，入口统一 |
| 📩 | **求片闭环** | 查重、投票、审批、订阅、通知 | 从提交到入库都有状态 |
| 📅 | **追剧缺集** | 日历、进度、漏集、下一集 | 哪集缺了，一眼看见 |
| 👥 | **用户运营** | 会员、积分、卡密、邀请码、配额 | 车队日常不用表格撑 |
| 🛡️ | **播放风控** | 在线会话、历史排行、异地 IP、设备规则 | 共享和异常有迹可查 |
| 📣 | **通知模板** | 入库海报、会员到期、求片审核、追更提醒 | Telegram 和站内通知文案统一管理 |
| 🤖 | **自动化联动** | MoviePilot、115、Telegram、AI Agent | 搜索、转存、通知串起来 |

## 🖼️ 主要界面

常用页面按“先看状态，再处理问题”的节奏排布。

|  | 页面 | 一眼看到 | 常用动作 |
|---|------|----------|----------|
| 🏠 | **仪表盘** | 在线播放、待处理求片、最近入库、服务器状态 | 拖拽 Widget，快速扫站点 |
| 🎞️ | **影视发现** | 平台筛选、趋势榜、详情、预告片 | 找片、播放、收藏、求片 |
| 📅 | **追剧日历** | 更新排期、库存状态、本月更新 | 看哪天更新、哪集未入库 |
| 📡 | **追剧订阅** | 入库进度、漏集、下一集时间 | 追更、补缺、自动求片 |
| 🔍 | **缺集审计** | Emby 与 TMDB 对比结果 | 扫描媒体库，定位缺失集 |
| 📊 | **播放监控** | 实时会话、播放历史、热度排行 | 看在线、查异常、做风控 |
| 🧰 | **设备管控** | 客户端类型、播放规则、限制策略 | 管设备、控共享、放行白名单 |
| 🔔 | **通知模板** | 入库、会员、求片、追更各场景模板 | 改标题正文、套预设、实时预览 |
| 💬 | **Telegram Bot** | 搜索、求片、签到、通知 | 用户自助，站长少手动回复 |

## 🐳 Docker 部署

推荐使用 Docker Compose。应用镜像：[`huanhq99/flixpilot`](https://hub.docker.com/r/huanhq99/flixpilot)，支持 `linux/amd64` 和 `linux/arm64`，默认使用 `latest`。

### 服务架构

| 服务 | 镜像 | 作用 | 默认端口 |
|------|------|------|----------|
| `flixpilot` | `huanhq99/flixpilot` | Caddy 托管 Vite 静态前端，Go 处理 API、集成和后台任务 | `3005`，容器内 `8080` |
| `flixpilot` 网关 | `huanhq99/flixpilot` | 可选的 Emby 反代网关，用于接管播放入口和风控 | `8091-8095` |
| `redis` | `redis:7-alpine` | 缓存、限流和后台任务辅助 | 容器内 `6379` |

### 部署前准备

| 项目 | 说明 |
|------|------|
| Docker / Docker Compose | 必需 |
| Emby 地址 | 必需，确保容器能访问到 |
| TMDB API Key | 推荐，用于影视发现、详情、追剧日历 |
| Telegram Bot Token | 可选，用于 Bot、入库频道通知和模板测试 |
| Redis | 默认 compose 已自带，作为缓存/限流使用 |
| 反向代理 HTTPS | 推荐，尤其是公网访问时 |

### 启动

```bash
curl -O https://raw.githubusercontent.com/huanhq99/FlixPilot/main/docker-compose.yml
docker compose up -d
```

访问 `http://服务器IP:3005`，首次进入会自动打开 `/setup` 初始化向导。

### 升级

```bash
docker compose pull
docker compose up -d
```

数据默认持久化在 `./data`。升级前建议备份：

```bash
cp -a data data.backup.$(date +%Y%m%d)
```

### 健康检查

- `GET /api/health`：浅层检查 Emby、TMDB 等外部服务状态。
- `GET /api/live`：只检查 Go API HTTP 服务是否已响应，供 Docker 健康检查使用。
- `GET /api/ready`：深层检查 SQLite、DataDir、Redis、Emby、TMDB、MasterKey，适合 readinessProbe。

## 🔐 安全建议

- 公网访问建议使用 HTTPS 反向代理。
- 设置并备份 `MASTER_KEY`，不要频繁更换。
- 不要公开 `.env.local`、`data/`、备份文件、Webhook URL、Emby API Key。
- 公开截图前检查是否包含服务器地址、API Key、用户名、邀请码、卡密等敏感信息。
- Webhook、Cron、管理员接口都应使用强随机密钥。
- 如果旧日志或截图暴露过 Emby API Key，建议在 Emby 后台重新生成。


<details>
<summary><strong>必须搭配 Emby 使用吗？</strong></summary>

是的。核心功能围绕 Emby API、Emby Webhook、Playback Reporting 和 Emby 用户/设备数据设计，非 Emby 站点的核心能力不会完整可用。

</details>

<details>
<summary><strong>数据存在哪里？会不会丢？</strong></summary>

默认保存在 `./data`（SQLite + JSON 文档），compose 已挂载到容器 `./data:/app/data`。升级不会清空数据，但升级前建议备份整个 `data/` 目录；面板内也自带按类别的备份导出。

</details>

<details>
<summary><strong>8091-8095 端口是什么？需要映射吗？</strong></summary>

可选的 Emby 反代网关端口段，用于接管播放入口和播放风控，默认 `8091`。不使用网关功能可以不映射；使用时端口需和面板里的“面板映射端口”保持一致。

</details>

<details>
<summary><strong>支持哪些平台？</strong></summary>

应用镜像支持 `linux/amd64` 和 `linux/arm64`，常见的 VPS、群晖、威联通等 x86/ARM NAS 都可以跑。

</details>

<details>
<summary><strong>没有 Redis 能跑吗？</strong></summary>

可以。Redis 用于缓存和限流增强，默认 compose 已自带；没有 Redis 时后端自动退化为内存实现，功能不受影响。

</details>

## 🤝 社区与反馈

- 📢 **Telegram 交流群**：<a href="https://t.me/EmbyCockpit">t.me/EmbyCockpit</a>
- 🐛 **Bug 反馈 & 功能建议**：[GitHub Issues](https://github.com/huanhq99/FlixPilot/issues)
- ⭐ 如果这个项目帮到你，欢迎点个 Star 支持一下

<details>
<summary><strong>技术栈</strong></summary>

| 层级 | 技术 |
|------|------|
| 框架 | Vite 8 + React Router |
| 前端 | React 19, TypeScript, Tailwind CSS 4, MUI 6, Recharts, SWR |
| 后端 | Go 1.24, Gin, GORM, SQLite；API 入口在 `backend/cmd/server` |
| 数据 | SQLite + JSON 文件 |
| 认证 | JWT + PBKDF2 密码哈希 |
| 校验 | Zod |
| AI | Agent 多 Provider (OpenAI / Anthropic / Gemini / DeepSeek / 兼容 API) + Gemini 辅助功能 |
| 部署 | Docker Compose 单应用镜像：Caddy `3005` + Go API `8080` + Redis + 可选 Emby 网关 |
| 包管理 | pnpm |
| 测试 | Vitest + Go test |

</details>

<details>
<summary><strong>项目结构</strong></summary>

```text
FlixPilot-Go/
├── src/
│   ├── routes/              # Vite + React Router 页面
│   ├── vite/                # React Router 外壳、路由生成和 Providers
│   ├── components/          # 通用组件、布局、仪表盘 Widget
│   ├── lib/                 # 浏览器侧工具和业务辅助函数
│   ├── hooks/               # 客户端 hooks
│   ├── contexts/            # React contexts
│   └── data/navigation/     # 菜单导航定义
├── backend/                 # Go API，Gin 路由与 SQLite/GORM 数据层
│   ├── cmd/server/          # Go API 和 Emby Gateway 启动入口
│   └── internal/httpapi/    # API 路由、集成、Webhook、Telegram 等后端逻辑
├── data/                    # 运行时数据，生产环境请持久化和备份
├── docs/                    # 更新说明和接口文档
├── public/                  # 静态资源
├── scripts/                 # 工具脚本
├── docker-compose.yml
├── Caddyfile                # Caddy 配置，反代 /api 到容器内 Go API
├── Dockerfile               # 前端与 Go API 一体化应用镜像
├── docker-entrypoint.sh     # 应用容器进程管理与数据目录权限处理
├── backend/Dockerfile       # 旧版独立 Go API 镜像兼容构建
└── package.json
```

</details>

<details>
<summary><strong>本地开发</strong></summary>

本地开发需要前端和 Go 后端同时运行。Vite 固定跑 `3005`，并把 `/api` 代理到 `localhost:8080`。

终端一：启动 Go API：

```bash
cd backend
DATA_DIR=../data GO_BACKEND_PORT=8080 EMBY_GATEWAY_PORT=8091 go run ./cmd/server
```

终端二：启动前端：

```bash
pnpm install
pnpm dev
```

常用命令：

```bash
# 生产构建
pnpm build

# 测试
pnpm test
cd backend && go test ./...

# 类型检查
pnpm typecheck
```

开发服务默认运行在 `http://localhost:3005`。生产运行时不跑 Vite/Node 开发服务，前端由 Caddy 静态托管，API 由同一应用容器里的 Go 服务提供。

</details>

## 📄 许可证

本项目采用 MIT License 许可协议。

## 🙏 致谢

感谢以下项目提供的技术支持：

[Emby](https://emby.media/) · [TMDB](https://www.themoviedb.org/) · [Material UI](https://mui.com/) · [React](https://react.dev/) · [Vite](https://vite.dev/)
