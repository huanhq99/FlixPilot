<p align="center">
  <img src="public/branding/readme-hero.svg" alt="FlixPilot · 视界 - Emby 站长的一体化运营面板" width="880" />
</p>

<p align="center">
  <strong>一个面板，把 Emby 站长每天最烦的事接住。</strong><br/>
  <sub>求片、追剧、缺集、播放风控、会员积分、Telegram Bot、AI Agent 和 115 联动，全都收进同一个工作台。</sub>
</p>

<p align="center">
  <a href="https://github.com/huanhq99/FlixPilot/stargazers"><img src="https://img.shields.io/github/stars/huanhq99/FlixPilot?style=for-the-badge&logo=github&label=Stars&color=0b84a5" alt="stars"></a>
  <a href="https://hub.docker.com/r/huanhq99/flixpilot"><img src="https://img.shields.io/docker/pulls/huanhq99/flixpilot?style=for-the-badge&logo=docker&color=0b84a5&label=Pulls" alt="docker pulls"></a>
  <a href="https://hub.docker.com/r/huanhq99/flixpilot"><img src="https://img.shields.io/docker/v/huanhq99/flixpilot?style=for-the-badge&logo=docker&label=Version&color=f59e0b" alt="version"></a>
  <a href="https://github.com/huanhq99/FlixPilot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/huanhq99/FlixPilot?style=for-the-badge&color=334155&label=License" alt="license"></a>
  <a href="https://t.me/EmbyCockpit"><img src="https://img.shields.io/badge/Telegram-交流群-229ed9?style=for-the-badge&logo=telegram" alt="Telegram"></a>
</p>

<p align="center">
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

它适合这些场景：

- 你在维护一个家庭影院、朋友共享服或中小型 Emby 站点。
- 你需要处理求片、追剧、会员、卡密、邀请码、设备限制、播放监控和通知。
- 你想把 MoviePilot、115、Telegram、TMDB、AI Agent 等工具串起来。
- 你希望用 Docker 快速部署，并通过 Web 初始化和设置页完成大部分配置。

它不适合这些场景：

- 你只想找片源，但没有自己的媒体库。
- 你不打算部署 Docker / VPS / NAS 环境。
- 你希望它替代 Emby 本体播放器。

说明：FlixPilot 围绕 Emby API、Emby Webhook、Playback Reporting 和 Emby 用户/设备数据设计；如果你的站点不是 Emby，部分核心能力不会完整可用。

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

升级前建议先备份 `data/` 目录。最近更新见 [v2.3.22 版本日志](docs/changelog/v2.3.22.md)。

## ✨ 核心特性

一句话：把 Emby 站点运营从“人肉处理”变成“流程闭环”。

|  | 场景 | FlixPilot 做什么 | 结果 |
|---|------|------------------|------|
| 🎬 | **自助找片** | 发现、详情、播放、收藏、片单 | 用户少问，入口统一 |
| 📩 | **求片闭环** | 查重、投票、审批、订阅、通知 | 从提交到入库都有状态 |
| 📅 | **追剧缺集** | 日历、进度、漏集、下一集 | 哪集缺了，一眼看见 |
| 👥 | **用户运营** | 会员、积分、卡密、邀请码、配额 | 车队日常不用表格撑 |
| 🛡️ | **播放风控** | 在线会话、历史排行、异地 IP、设备规则 | 共享和异常有迹可查 |
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
| 💬 | **Telegram Bot** | 搜索、求片、签到、通知 | 用户自助，站长少手动回复 |

## 🐳 Docker 部署

推荐使用 Docker Compose。镜像：[`huanhq99/flixpilot`](https://hub.docker.com/r/huanhq99/flixpilot)，支持 `linux/amd64` 和 `linux/arm64`。

### 部署前准备

| 项目 | 说明 |
|------|------|
| Docker / Docker Compose | 必需 |
| Emby 地址 | 必需，确保容器能访问到 |
| TMDB API Key | 推荐，用于影视发现、详情、追剧日历 |
| Telegram Bot Token | 可选，用于 Bot 和通知 |
| Redis | 默认 compose 已自带；自定义部署时可接外部 Redis |
| 反向代理 HTTPS | 推荐，尤其是公网访问时 |

### 启动

```bash
curl -O https://raw.githubusercontent.com/huanhq99/FlixPilot/main/docker-compose.yml
docker compose up -d
```

访问 `http://服务器IP:3005`，首次进入会自动打开 `/setup` 初始化向导。

默认 compose 会关闭 Redis 容器日志，避免 `docker compose logs` 被 Redis 英文启动信息刷屏。业务排查优先看面板里的 **系统日志**；Redis 是否正常可看容器健康状态或 `/api/ready`。

### 配置怎么填？

普通用户不用先看环境变量。按下面顺序来就行：

| 阶段 | 你需要做什么 |
|------|--------------|
| 启动前 | 准备 Docker / Docker Compose，确认服务器能访问你的 Emby |
| 第一次打开面板 | 按初始化向导创建管理员账号，并填写 Emby 地址和 API Key |
| 后续设置页 | 按需填写 TMDB、Telegram、MoviePilot、115、AI Provider 等功能配置 |

<details>
<summary><strong>高级：什么时候才需要改环境变量？</strong></summary>

大多数情况下，这一段可以跳过。环境变量主要给迁移、私有部署、外部 Redis、本地开发或高级安全配置使用。

| 你想做什么 | 需要改的变量 | 怎么理解 |
|------------|--------------|----------|
| 手动指定登录密钥 | `JWT_SECRET` | 一般不用改；不填会自动生成到 `data/jwt-secret.txt`，跟着 `data/` 一起备份即可 |
| 手动指定定时任务密钥 | `CRON_SECRET` | 一般不用改；不填会自动生成到 `data/cron-secret.txt` |
| 加密保存敏感配置 | `MASTER_KEY` | 可选；像“保险箱钥匙”，启用后必须长期保留，丢了就解不开旧配置 |
| 使用外部 Redis | `REDIS_URL` | 默认 compose 已自带 Redis；只有你想接自己的 Redis 时才改 |
| 改数据目录 | `DATA_DIR` | Docker 部署默认写入容器内 `/app/data`，并映射到宿主机 `./data` |
| 改时区 | `TZ` | 默认中国时区 `Asia/Shanghai`；海外部署才可能需要改 |
| 本地开发也跑后台任务 | `FLIXPILOT_DEV_BACKGROUND_JOBS` | 只给开发者用，普通 Docker 部署不用管 |
| 私有化或复杂网络部署 | `LICENSE_SERVER` / `EMBY_HOST_FALLBACKS` / 代理参数 | 特殊场景才需要，普通用户不用配置 |

</details>

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

<details>
<summary><strong>技术栈</strong></summary>

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 15 App Router |
| 前端 | React 18, MUI 6, Tailwind CSS, Recharts, SWR |
| 后端 | Next.js API Routes, Node.js runtime, undici |
| 数据 | JSON 文件 + SQLite, 可选 Redis |
| 认证 | JWT + PBKDF2 密码哈希 |
| 校验 | Zod |
| AI | Agent 多 Provider (OpenAI / Anthropic / Gemini / DeepSeek / 兼容 API) + Gemini 辅助功能 |
| 部署 | Docker Multi-Arch, 端口 3005 |
| 包管理 | pnpm |
| 测试 | Vitest |

</details>

<details>
<summary><strong>项目结构</strong></summary>

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

</details>

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
<summary><strong>FlixPilot 是官方 Emby 的一部分吗？</strong></summary>

不是。FlixPilot 是独立的第三方管理面板，通过官方 API 接入你自己的 Emby 服务器。它不修改服务器本体。
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

通常是代理或目标服务不可达。检查代理配置、DNS、容器网络、Emby 地址、MoviePilot 地址和服务器防火墙。FlixPilot 会分别检测 Telegram 与 TMDB，并在代理失败日志里脱敏显示代理地址、目标主机和错误码。
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
<summary><strong>和 MoviePilot / 其他求片工具是什么关系？</strong></summary>

FlixPilot 聚焦 Emby 站点的日常运维和用户自助入口，和下载、订阅或纯求片工具互补。配置 MoviePilot 后可联动求片和订阅。
</details>

## 🧭 更新记录

- [v2.3.22 版本日志](docs/changelog/v2.3.22.md)
- 历史版本可查看 `docs/changelog/`

## 🤝 社区与反馈

- 📢 **Telegram 交流群**：<a href="https://t.me/EmbyCockpit">t.me/EmbyCockpit</a>
- 🐛 **Bug 反馈 & 功能建议**：[GitHub Issues](https://github.com/huanhq99/FlixPilot/issues)
- ⭐ 如果这个项目帮到你，欢迎点个 Star 支持一下

## 📄 许可证

本项目采用 [MIT License](https://github.com/huanhq99/FlixPilot/blob/main/LICENSE) 许可协议。

## 🙏 致谢

感谢以下项目提供的技术支持：

[Emby](https://emby.media/) · [TMDB](https://www.themoviedb.org/) · [Material UI](https://mui.com/) · [Next.js](https://nextjs.org/)
