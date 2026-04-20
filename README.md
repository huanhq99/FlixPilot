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

你是否正在经历这些：

- 🧩 Emby 后台功能散乱，要装一堆插件才能凑齐用户管理、流量统计、求片……
- 📺 观众反复私聊问"XX 剧的 S02E08 有没有入库"，你还得手动一集集核对
- 💸 CDN 流量账单像谜，搞不清楚谁刷了多少，会员到期也没人提醒
- 🤖 想做 Telegram Bot 搜索 / 求片 / 签到，但又不会从头开发
- 🎞️ 想给生肉剧集加中文字幕，折腾翻译脚本折腾到想砸键盘

**FlixPilot** 就是为了解决这些问题而生的——**一个面板搞定所有事**。

> 🎯 **定位**：给中小型 Emby / Jellyfin 车队主、家庭影院玩家、私有云发烧友的 "一体化驾驶舱"。
> 📦 **形态**：Docker 一键部署，单镜像，自带 Web UI、API、定时任务、Bot、插件中心。
> 🔑 **理念**：让非运维背景的站长也能轻松管理成百上千用户。

---

## 🚀 快速开始

```bash
# 下载 docker-compose.yml
curl -O https://raw.githubusercontent.com/huanhq99/FlixPilot/main/docker-compose.yml

# 启动
docker compose up -d

# 浏览器访问 http://你的IP:3005 → 初始化向导
```

三步完成。剩下的交给面板。



### 🎬 影视发现与浏览
- **全球流媒体发现页**：10 大平台（爱优腾 B / Netflix / Disney+ / HBO / Apple TV+ / Amazon / Hulu）筛选，平台专属预设
- **趋势排行**：14 个横滚分区，Banner 自动轮播，分批加载
- **追剧日历**：剧集更新日历，双色库存标记（绿=已入库 / 橙=今日播出），SxxExx 全覆盖
- **影视详情弹窗**：TMDB 详情 + 演员表 + 推荐/类似 + 评论 + 预告片 + 剧集浏览 + 一键播放
- **个性化推荐**：基于观看历史的 "猜你喜欢" 横栏
- **无限滚动 + URL 状态同步**：刷新/分享不丢状态

### 🏠 可定制仪表盘
- **12 个 Widget**：欢迎 / 天气 / 服务器监控 / 正在播放 / 最近入库 / 入库趋势 / 媒体库总览 / 求片 / 快捷操作 / 继续观看 / 个性推荐 / 媒体库列表
- **拖拽布局**：react-grid-layout 实现自由拖拽 / 缩放 / 显示隐藏
- **管理员 / 用户双视图**：服务器监控 Widget 根据角色自动切换（CPU/内存仪表 vs 在线状态卡）

### 🛠️ 媒体运维中心
- **智能缺集管理**：30+ 并发线程扫描引擎，Emby vs TMDB 深度比对，水平卡片看板展示
- **库品质审计**：全库分辨率 / 编码 / HDR / DV 分析，文件空间占比统计
- **去重管理**：媒体库重复文件检测与清理
- **播放监控**：实时会话监控 + 播放历史 + 排行统计

### 👥 用户管理系统
- **多层级权限**：管理员 / 普通用户 / 会员体系（积分 / 签到 / 卡密兑换）
- **流控计费**：GoEdge 流量日志对接，倍数系数 + 会员有效期同步
- **邀请制注册**：邀请码系统 + 抽奖活动
- **设备管理**：自动 / 手动注册设备
- **用户求片**：检查入库 / 重复，+1 投票，管理员审批通知

### 🤖 Telegram Bot
- **用户命令**：绑定 / 签到 / 积分 / 搜索 / 最新 / 热门 / 状态
- **影巢集成**：TMDB 匹配 → 海报卡片 → 一键解锁 + 转存到 115 网盘
- **TG 频道搜索**：关键词搜索 → 一键转存
- **管理员命令**：通知 / 封禁 / 抽奖开奖
- **115 链接自动处理**：发送分享链接自动解析转存

### 🔔 多渠道通知
- **6 种渠道**：Telegram / 邮件 / Bark / ServerChan / PushPlus / 自定义 Webhook
- **站内通知中心**：铃铛实时提醒，求片审批 / 会员到期 / 系统公告

### 🧩 插件中心（6 个）

| 插件 | 功能 |
|------|------|
| 115 网盘同步 | Cookie 管理、转存文件夹配置、TG 链接自动转存 |
| 影巢签到 | API Key 配置、自动签到、积分查询 |
| IMDB 片单 | IMDB 片单导入、批量添加到库 |
| 公告助手 | AI 辅助公告撰写（Gemini） |
| 字幕翻译 | AI 字幕翻译（Gemini, SRT/ASS） |
| Emby 维护 | Emby 服务器维护工具 |

### 🔒 安全机制
- JWT 密钥自动生成 + AES-256-GCM 敏感配置加密（MASTER_KEY）
- PBKDF2 密码哈希（100k 迭代, sha512）
- SSRF 防护：私有 IP 拦截 + 域名白名单
- 登录限流：5 次失败锁定 15 分钟
- Cron / Webhook 端点 Token 认证
- 备份导出自动遮蔽敏感字段

---

## 🖼️ 界面预览

> 截图会在后续版本陆续补充，可先加入 [Telegram 交流群](https://t.me/EmbyCockpit) 查看真实部署案例。

| 模块 | 说明 |
|------|------|
| 🏠 **可拖拽仪表盘** | 12 个 Widget 自由组合，管理员与普通用户视图自动切换 |
| 🎞️ **全球影视发现** | 10 大平台筛选 + 平台专属 Preset，无限滚动 + URL 状态同步 |
| 📅 **追剧日历** | 双色库存标记，一眼看懂哪一集还缺 |
| 🔍 **智能缺集审计** | 30 线程并发扫描，Emby vs TMDB 自动对比 |
| 📊 **播放监控 & 排行** | 实时会话 + 历史回放 + 热度榜单 |
| 🤖 **Telegram Bot** | 搜索 / 求片 / 签到 / 一键转存 115 |

---

## 🐳 Docker 部署

推荐使用 **Docker Compose** 一键部署。

**镜像**：[`huanhq99/flixpilot`](https://hub.docker.com/r/huanhq99/flixpilot)（支持 AMD64 + ARM64）

### 快速开始

```bash
# 1. 下载部署文件
curl -O https://raw.githubusercontent.com/huanhq99/FlixPilot/main/docker-compose.yml

# 2. 启动
docker compose up -d

# 3. 打开浏览器访问 http://服务器IP:3005
#    首次访问会自动进入 /setup 初始化向导
```

### 关键环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `JWT_SECRET` | JWT 签名密钥 | 自动生成到 `data/jwt-secret.txt` |
| `CRON_SECRET` | 定时任务 Bearer Token | 自动生成到 `data/cron-secret.txt` |
| `MASTER_KEY` | **敏感配置 AES-256-GCM 加密主密钥**。未设置时 config 中的密钥为明文。**丢失将无法解密，请妥善备份！** | — |
| `REDIS_URL` | Redis 连接地址 | `redis://localhost:6379` |
| `DATA_DIR` | 数据目录路径 | `./data` |
| `TZ` | 时区 | `Asia/Shanghai` |
| `LICENSE_SERVER` | 授权服务器地址（商业版） | — |

### 升级

```bash
docker compose pull
docker compose up -d
```

数据自动持久化在 `./data`，升级无损。

### 健康检查

- 浅层：`GET /api/health` — Emby / TMDB 等外部服务状态
- 深层：`GET /api/ready` — SQLite / DataDir / Redis / Emby / TMDB / MasterKey（供 K8s readinessProbe）

---

## 🔧 技术栈

| 层级 | 技术 |
|------|------|
| **框架** | [Next.js 15](https://nextjs.org/)（App Router, Turbopack dev, standalone output） |
| **前端** | React 18, [MUI 6](https://mui.com/), Tailwind CSS 3, Recharts, SWR, react-grid-layout |
| **后端** | Next.js API Routes（Node.js runtime）, `undici`（代理）, 无独立后端 |
| **数据存储** | JSON 文件（`data/` 目录）+ SQLite（`better-sqlite3`） |
| **缓存** | Redis 7（可选，用于缓存 / 限流） |
| **认证** | JWT（HMAC-SHA256）+ PBKDF2 密码哈希 |
| **验证** | Zod v4 输入校验 |
| **AI** | Gemini API（字幕翻译、公告助手） |
| **部署** | Docker Multi-Arch（AMD64 / ARM64），端口 3005 |
| **包管理** | pnpm |
| **测试** | Vitest |

---

## 🗂️ 项目结构

```
FlixPilot/
├── src/
│   ├── app/
│   │   ├── (dashboard)/          # 后台页面路由 (需登录)
│   │   ├── (blank-layout-pages)/ # login, register, setup
│   │   └── api/                  # API 路由
│   ├── components/               # React 组件
│   │   ├── dashboard/            # 首页仪表板 Widget (12个)
│   │   ├── layout/               # 布局组件
│   │   ├── MediaDetailModal.tsx  # 影视详情弹窗
│   │   └── ...
│   ├── lib/                      # 核心业务逻辑
│   │   ├── auth.ts               # 认证 (JWT/密码/用户CRUD)
│   │   ├── dataStore.ts          # JSON 文件读写 (内存缓存+互斥锁)
│   │   ├── secrets.ts            # AES-256-GCM 加密
│   │   ├── embyClient.ts         # Emby API 封装
│   │   ├── embyScanner.ts        # 媒体库扫描引擎 (30线程并发)
│   │   ├── telegram/             # Telegram Bot (router + 命令模块)
│   │   └── ...
│   ├── services/                 # 外部服务集成
│   │   ├── tmdbService.ts        # TMDB 搜索/热门/趋势
│   │   ├── geminiService.ts      # Gemini AI
│   │   └── ...
│   └── utils/                    # 工具函数
│       ├── dedupFetch.ts         # 客户端请求去重 (5秒窗口)
│       └── format.ts             # 格式化工具
├── data/                         # JSON + SQLite 数据 (持久化)
├── scripts/                      # 调试/测试脚本
├── docker-compose.yml            # Docker Compose 部署
├── Dockerfile
└── vitest.config.ts
```

---

## 💻 本地开发

```bash
# 安装依赖
pnpm install

# 启动开发服务器 (Turbopack, 端口 3005)
pnpm dev

# 生产构建
pnpm build

# 运行测试
pnpm test
```

---

## ❓ 常见问题

<details>
<summary><strong>FlixPilot 是官方 Emby / Jellyfin 的一部分吗？</strong></summary>

不是。FlixPilot 是独立的第三方管理面板，通过官方 API 接入你自有的 Emby / Jellyfin 服务器。它不修改服务器本身，卸载干净无残留。
</details>

<details>
<summary><strong>必须懂代码才能部署吗？</strong></summary>

不需要。只要你会在一台 VPS 或 NAS 上执行 <code>docker compose up -d</code>，就能跑起来。其他所有配置都在 Web 初始化向导里完成。
</details>

<details>
<summary><strong>数据会上传到第三方服务器吗？</strong></summary>

不会。所有用户数据、配置、播放历史都只存在你自己的 <code>./data</code> 目录里。面板本身无遥测。
</details>

<details>
<summary><strong>支持多用户 / 车队运营吗？</strong></summary>

完全支持。内置邀请码、激活码、积分 / 签到、会员到期、流量配额、Telegram Bot 通知等车队常用能力。
</details>

<details>
<summary><strong>和 MoviePilot / Jellyseerr / Overseerr 是什么关系？</strong></summary>

FlixPilot 聚焦在 "Emby 车队主的日常运维 + 用户自助浏览" 这个细分场景，和纯下载 / 纯求片工具互补而不是替代。配置了 MoviePilot 后可直接联动求片。
</details>

---

## 🤝 社区与反馈

- 📢 **Telegram 交流群**：<a href="https://t.me/EmbyCockpit">t.me/EmbyCockpit</a>
- 🐛 **Bug 反馈 & 功能建议**：[GitHub Issues](https://github.com/huanhq99/FlixPilot/issues)
- ⭐ 如果这个项目帮到你，欢迎点个 Star 支持一下

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可协议。

---

## 🙏 致谢

感谢以下项目提供的技术支持：

[Emby](https://emby.media/) · [Jellyfin](https://jellyfin.org/) · [TMDB](https://www.themoviedb.org/) · [Material UI](https://mui.com/) · [Next.js](https://nextjs.org/)
