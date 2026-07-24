<p align="center">
  <img src="public/branding/readme-hero.svg" alt="FlixPilot · 视界 - Emby 站长的一体化运营面板" width="880" />
</p>

<p align="center">
  <strong>一个面板，把 Emby 站长每天最烦的事接住。</strong><br/>
  <sub>求片 · 追剧 · 缺集 · 风控 · 会员 · 通知 · TG Bot · AI Agent · 115，全部收进同一个工作台。</sub>
</p>

<p align="center">
  <a href="https://github.com/huanhq99/FlixPilot/stargazers"><img src="https://img.shields.io/github/stars/huanhq99/FlixPilot?style=for-the-badge&logo=github&label=Stars&color=0b84a5" alt="stars"></a>
  <a href="https://hub.docker.com/r/huanhq99/flixpilot"><img src="https://img.shields.io/docker/pulls/huanhq99/flixpilot?style=for-the-badge&logo=docker&color=0b84a5&label=Pulls" alt="docker pulls"></a>
  <a href="https://hub.docker.com/r/huanhq99/flixpilot"><img src="https://img.shields.io/docker/v/huanhq99/flixpilot?style=for-the-badge&logo=docker&label=Version&color=f59e0b" alt="version"></a>
  <a href="https://t.me/EmbyCockpit"><img src="https://img.shields.io/badge/Telegram-交流群-229ed9?style=for-the-badge&logo=telegram" alt="Telegram"></a>
</p>

<p align="center">
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-特性一览">特性</a> ·
  <a href="#-部署">部署</a> ·
  <a href="#-常见问题">FAQ</a> ·
  <a href="https://t.me/EmbyCockpit">交流群</a>
</p>

## 🚀 快速开始

```bash
mkdir -p flixpilot && cd flixpilot
curl -O https://raw.githubusercontent.com/huanhq99/FlixPilot/main/docker-compose.yml
docker compose up -d
```

访问 `http://服务器IP:3005`，首次进入自动打开初始化向导。只需要一个镜像（`huanhq99/flixpilot`，amd64/arm64）+ 自带 Redis。

## ✨ 特性一览

|  |  |  |
|---|---|---|
| 🎬 **自助找片**<br/>发现 · 详情 · 播放 · 收藏 | 📩 **求片闭环**<br/>查重 · 投票 · 审批 · 通知 | 📅 **追剧缺集**<br/>日历 · 漏集 · 下一集 |
| 👥 **用户运营**<br/>会员 · 卡密 · 邀请码 · 配额 | 🛡️ **播放风控**<br/>在线会话 · 排行 · 设备规则 | 📣 **通知模板**<br/>入库 · 到期 · 求片 · 追更 |
| 🤖 **自动化联动**<br/>MoviePilot · 115 · TG · AI Agent | 🖼️ **界面即开即用**<br/>仪表盘 · 日历 · 监控 · 管控 | 🐳 **单镜像部署**<br/>Caddy + Go API + Redis |

## 🐳 部署

应用镜像 [`huanhq99/flixpilot`](https://hub.docker.com/r/huanhq99/flixpilot)：`3005` 对外（Caddy 托管前端 + 反代 Go API），`8091-8095` 为可选 Emby 网关端口段。

<details>
<summary><strong>部署前准备 / 升级 / 健康检查</strong></summary>

| 项目 | 说明 |
|------|------|
| Docker / Compose | 必需 |
| Emby 地址 | 必需，确保容器能访问 |
| TMDB API Key | 推荐，用于发现/详情/日历 |
| Telegram Bot Token | 可选，用于 Bot 与通知 |

升级：

```bash
docker compose pull && docker compose up -d
```

数据在 `./data`（SQLite + JSON），升级前建议 `cp -a data data.backup.$(date +%Y%m%d)`。

健康检查：`/api/live`（存活）· `/api/ready`（依赖就绪）· `/api/health`（外部服务）。

</details>

<details>
<summary><strong>安全建议</strong></summary>

- 公网访问建议套 HTTPS 反代；设置并备份 `MASTER_KEY`。
- 不要公开 `.env.local`、`data/`、备份文件、Webhook URL、Emby API Key。
- 截图前检查是否含服务器地址、Key、邀请码、卡密；暴露过的 Key 及时在 Emby 后台重置。

</details>

<details>
<summary><strong>它不适合谁？</strong></summary>

只想找片源但没有自己媒体库的；不打算部署 Docker 环境的；想用它替代 Emby 播放器的。核心能力围绕 Emby API / Webhook / Playback Reporting 设计，非 Emby 站点不完整可用。

</details>

## ❓ 常见问题

<details>
<summary><strong>必须搭配 Emby 吗？</strong></summary>

是。核心功能围绕 Emby API、Webhook、Playback Reporting 设计，非 Emby 站点核心能力不完整可用。

</details>

<details>
<summary><strong>8091-8095 端口是什么？</strong></summary>

可选的 Emby 反代网关，用于接管播放入口和风控，默认 `8091`。不用网关就不映射；用时需和面板里的"面板映射端口"一致。

</details>

<details>
<summary><strong>数据会丢吗？没有 Redis 能跑吗？</strong></summary>

数据在 `./data`，升级不清空；面板自带按类别备份导出。Redis 用于缓存/限流增强，没有时自动退化为内存实现，功能不受影响。

</details>

<details>
<summary><strong>技术栈与本地开发</strong></summary>

Vite 8 + React 19 + TS + Tailwind 4 + MUI 6 / Go 1.24 + Gin + GORM + SQLite / pnpm。

```bash
# 终端一
cd backend && DATA_DIR=../data GO_BACKEND_PORT=8080 EMBY_GATEWAY_PORT=8091 go run ./cmd/server
# 终端二
pnpm install && pnpm dev   # http://localhost:3005
```

常用命令：`pnpm build` · `pnpm test` · `pnpm typecheck` · `cd backend && go test ./...`

</details>

---

<p align="center">
  <a href="https://t.me/EmbyCockpit">📢 Telegram 交流群</a> ·
  <a href="https://github.com/huanhq99/FlixPilot/issues">🐛 反馈与建议</a> ·
  ⭐ 觉得有用欢迎 Star
</p>

<p align="center">
  <sub>MIT License · 致谢 <a href="https://emby.media/">Emby</a> / <a href="https://www.themoviedb.org/">TMDB</a> / <a href="https://mui.com/">MUI</a> / <a href="https://react.dev/">React</a> / <a href="https://vite.dev/">Vite</a></sub>
</p>
