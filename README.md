# 🎬 FlixPilot · 视界

<p align="center">
  <img src="public/logo.png" alt="FlixPilot" width="160" />
</p>

<p align="center">
  <strong>为 Emby / Jellyfin 量身打造的全能管理面板</strong><br/>
  <sub>一个面板，接管你的私有云媒体服务器</sub>
</p>

<p align="center">
  <a href="https://github.com/huanhq99/FlixPilot/stargazers"><img src="https://img.shields.io/github/stars/huanhq99/FlixPilot?style=flat-square&logo=github&label=Stars&color=blue" alt="stars"></a>
  <a href="https://github.com/huanhq99/FlixPilot/network/members"><img src="https://img.shields.io/github/forks/huanhq99/FlixPilot?style=flat-square&logo=github&label=Forks&color=blue" alt="forks"></a>
  <a href="https://hub.docker.com/r/huanhq99/flixpilot"><img src="https://img.shields.io/docker/pulls/huanhq99/flixpilot?style=flat-square&logo=docker&color=blue&label=Pulls" alt="docker pulls"></a>
  <a href="https://hub.docker.com/r/huanhq99/flixpilot"><img src="https://img.shields.io/docker/v/huanhq99/flixpilot?style=flat-square&logo=docker&label=Version&color=green" alt="version"></a>
  <a href="https://github.com/huanhq99/FlixPilot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/huanhq99/FlixPilot?style=flat-square&color=gray&label=License" alt="license"></a>
  <a href="https://t.me/EmbyCockpit"><img src="https://img.shields.io/badge/Telegram-交流群-0088cc?style=flat-square&logo=telegram" alt="Telegram"></a>
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-核心特性">核心特性</a> ·
  <a href="#-界面预览">界面预览</a> ·
  <a href="#-docker-部署">部署</a> ·
  <a href="#-常见问题">FAQ</a> ·
  <a href="https://t.me/EmbyCockpit">加入交流群</a>
</p>

---

## 💡 这是什么？

FlixPilot 是一个面向 Emby / Jellyfin 私有媒体服的 Web 管理面板，负责把用户、求片、追剧、播放监控、媒体库运维、Telegram Bot、通知和插件能力收进同一个驾驶舱。

它更适合这些场景：

- 你在维护一个家庭影院、朋友共享服或中小型 Emby / Jellyfin 站点。
- 你需要处理用户求片、追剧缺集、会员到期、设备限制、播放监控和通知。
- 你希望用 Docker 快速部署，并通过 Web 初始化完成大部分配置。
- 你想把 MoviePilot、115、Telegram、TMDB 等工具串起来，少切几个后台。

它不适合这些场景：

- 你只想找片源，但没有自己的媒体库。
- 你不打算部署 Docker / VPS / NAS 环境。
- 你希望它替代 Emby / Jellyfin 本体播放器。

## 🚀 快速开始

```bash
# 下载 docker-compose.yml
curl -O https://raw.githubusercontent.com/huanhq99/FlixPilot/main/docker-compose.yml

# 启动
docker compose up -d

# 浏览器访问 http://你的IP:3005
# 首次进入会自动跳转初始化向导
```

升级前建议先备份 `data/` 目录。最近更新见 [v2.3.10 更新说明](docs/更新说明-2.3.10.md)。

## ✨ 核心特性

| 模块 | 能力 | 适用场景 |
|------|------|----------|
| 影视发现 | 流媒体平台筛选、趋势排行、详情弹窗、演员/推荐/预告片、一键播放 | 给用户提供自助浏览入口 |
| 追剧订阅 | 入库进度、下一集时间、漏集提示、自动求片、追剧详情 | 快速判断剧集是否追平 |
| 追剧日历 | 按周排期、今日更新、本月更新详情、平台 Logo、集数范围 | 查看未来更新和已入库状态 |
| 求片系统 | 重复检测、投票、审批、拒绝、自动订阅、静默刷新 | 处理用户点播需求 |
| 仪表盘 | 12 个 Widget、拖拽布局、管理员/用户双视图 | 快速掌握站点状态 |
| 媒体运维 | 缺集管理、品质审计、去重、媒体库同步 | 维护大库和排查缺集 |
| 播放监控 | 实时会话、播放历史、排行榜、异常检测 | 观察用户观看和资源热度 |
| 用户体系 | 邀请码、卡密、积分、签到、会员到期、流量配额 | 适合多用户和车队运营 |
| 设备管控 | 按设备分组拦截第三方客户端，支持记录和阻止播放 | 控制不允许的播放器 |
| Telegram Bot | 绑定、签到、搜索、求片、通知、转存、Agent 调用 | 移动端和群组入口 |
| 插件中心 | 115 网盘、影巢、IMDB 片单、公告助手、字幕翻译、Emby 维护 | 扩展常用自动化能力 |
| 安全机制 | JWT、PBKDF2、AES-256-GCM、登录限流、Webhook Token、备份脱敏 | 降低配置和账号风险 |

## 🖼️ 界面预览

| 模块 | 说明 |
|------|------|
| 🏠 **可拖拽仪表盘** | Widget 自由组合，管理员与普通用户视图自动切换 |
| 🎞️ **全球影视发现** | 平台筛选、趋势横栏、详情弹窗和一键播放 |
| 📅 **追剧日历** | 更新排期、入库状态、本月更新详情 |
| 📡 **追剧订阅** | 入库进度、下一集时间、漏集提醒 |
| 🔍 **智能缺集审计** | Emby 与 TMDB 自动比对，定位缺失集数 |
| 📊 **播放监控** | 实时会话、历史回放、热度榜单 |
| 🤖 **Telegram Bot** | 搜索、求片、签到、转存、通知 |

> 建议把真实截图放到 `public/screenshots/` 后在这里展示，README 的第一印象会更强。

## 🐳 Docker 部署

推荐使用 Docker Compose。镜像：[`huanhq99/flixpilot`](https://hub.docker.com/r/huanhq99/flixpilot)，支持 `linux/amd64` 和 `linux/arm64`。

### 部署前准备

| 项目 | 说明 |
|------|------|
| Docker / Docker Compose | 必需 |
| Emby / Jellyfin 地址 | 必需，确保容器能访问到 |
| TMDB API Key | 推荐，用于影视发现、详情、追剧日历 |
| Telegram Bot Token | 可选，用于 Bot 和通知 |
| Redis | 可选，用于缓存、限流等能力 |
| 反向代理 HTTPS | 推荐，尤其是公网访问时 |

### 启动

```bash
curl -O https://raw.githubusercontent.com/huanhq99/FlixPilot/main/docker-compose.yml
docker compose up -d
```

访问 `http://服务器IP:3005`，首次进入会自动打开 `/setup` 初始化向导。

### 关键环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | 自动生成到 `data/jwt-secret.txt` |
| `CRON_SECRET` | 定时任务 Bearer Token | 自动生成到 `data/cron-secret.txt` |
| `MASTER_KEY` | 敏感配置 AES-256-GCM 加密主密钥，丢失后无法解密旧配置 | 无 |
| `REDIS_URL` | Redis 连接地址 | `redis://localhost:6379` |
| `DATA_DIR` | 数据目录路径 | `./data` |
| `TZ` | 时区 | `Asia/Shanghai` |
| `LICENSE_SERVER` | 授权服务器地址，商业版使用 | 无 |

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
- `GET /api/ready`：深层检查 SQLite、DataDir、Redis、Emby、TMDB、MasterKey，适合 readinessProbe。

## 🔐 安全建议

- 公网访问建议使用 HTTPS 反向代理。
- 设置并备份 `MASTER_KEY`，不要频繁更换。
- 不要公开 `.env.local`、`data/`、备份文件、Webhook URL、Emby API Key。
- 公开截图前检查是否包含服务器地址、API Key、用户名、邀请码、卡密等敏感信息。
- Webhook、Cron、管理员接口都应使用强随机密钥。
- 如果旧日志或截图暴露过 Emby API Key，建议在 Emby 后台重新生成。

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 App Router |
| 前端 | React 18, MUI 6, Tailwind CSS, Recharts, SWR |
| 后端 | Next.js API Routes, Node.js runtime, undici |
| 数据 | JSON 文件 + SQLite, 可选 Redis |
| 认证 | JWT + PBKDF2 密码哈希 |
| 校验 | Zod |
| AI | Gemini API |
| 部署 | Docker Multi-Arch, 端口 3005 |
| 包管理 | pnpm |
| 测试 | Vitest |

## 🗂️ 项目结构

```text
FlixPilot/
├── src/
│   ├── app/                 # App Router 页面和 API
│   ├── components/          # 通用组件、布局、仪表盘 Widget
│   ├── lib/                 # 认证、配置、Emby、MoviePilot、Telegram、缓存、数据读写
│   ├── hooks/               # 客户端 hooks
│   ├── contexts/            # React contexts
│   └── data/navigation/     # 菜单导航定义
├── data/                    # 运行时数据，生产环境请持久化和备份
├── docs/                    # 更新说明和接口文档
├── public/                  # 静态资源
├── scripts/                 # 工具脚本
├── docker-compose.yml
├── Dockerfile
└── package.json
```

## 💻 本地开发

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

# 类型检查
pnpm exec tsc --noEmit
```

开发服务默认运行在 `http://localhost:3005`。

## ❓ 常见问题

<details>
<summary><strong>FlixPilot 是官方 Emby / Jellyfin 的一部分吗？</strong></summary>

不是。FlixPilot 是独立的第三方管理面板，通过官方 API 接入你自己的 Emby / Jellyfin 服务器。它不修改服务器本体。
</details>

<details>
<summary><strong>必须懂代码才能部署吗？</strong></summary>

不需要。只要能运行 Docker Compose，就可以通过 Web 初始化向导完成主要配置。
</details>

<details>
<summary><strong>数据会上传到第三方服务器吗？</strong></summary>

不会。用户、配置、播放历史等数据默认保存在你自己的 `data/` 目录。第三方 API 只在你启用相关功能时调用，例如 TMDB、Telegram、Gemini、MoviePilot。
</details>

<details>
<summary><strong>VPS 容器访问不到家里的 Emby 怎么办？</strong></summary>

先确认容器所在机器能访问 Emby 地址。家里内网地址如 `192.168.x.x` 通常不能被 VPS 直接访问，需要公网反代、VPN、Tailscale、WireGuard、内网穿透或把 FlixPilot 部署到同一内网。
</details>

<details>
<summary><strong>日志里出现 `fetch failed` 或 `undici dispatcher` 是什么？</strong></summary>

通常是代理或目标服务不可达。检查代理配置、DNS、容器网络、Emby 地址、MoviePilot 地址和服务器防火墙。v2.3.10 已降低代理失败刷屏和重复重试带来的压力。
</details>

<details>
<summary><strong>3005 端口被占用怎么办？</strong></summary>

先找出占用端口的进程或容器，再停止旧实例，或修改 Docker Compose 端口映射。注意浏览器访问端口要与映射后的宿主机端口一致。
</details>

<details>
<summary><strong>忘记 `MASTER_KEY` 会怎样？</strong></summary>

使用 `MASTER_KEY` 加密后的敏感配置需要同一个密钥解密。丢失后旧密文无法恢复，只能重新填写相关配置，所以请妥善备份。
</details>

<details>
<summary><strong>和 MoviePilot / Jellyseerr / Overseerr 是什么关系？</strong></summary>

FlixPilot 聚焦 Emby / Jellyfin 站点的日常运维和用户自助入口，和下载、订阅或纯求片工具互补。配置 MoviePilot 后可联动求片和订阅。
</details>

## 🧭 更新记录

- [v2.3.10 更新说明](docs/更新说明-2.3.10.md)
- 历史版本可查看 `docs/changelog/`

## 🤝 社区与反馈

- 📢 **Telegram 交流群**：<a href="https://t.me/EmbyCockpit">t.me/EmbyCockpit</a>
- 🐛 **Bug 反馈 & 功能建议**：[GitHub Issues](https://github.com/huanhq99/FlixPilot/issues)
- ⭐ 如果这个项目帮到你，欢迎点个 Star 支持一下

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可协议。

## 🙏 致谢

感谢以下项目提供的技术支持：

[Emby](https://emby.media/) · [Jellyfin](https://jellyfin.org/) · [TMDB](https://www.themoviedb.org/) · [Material UI](https://mui.com/) · [Next.js](https://nextjs.org/)
