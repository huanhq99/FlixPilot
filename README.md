# 🎬 FlixPilot `v2.2.5.026`

<p align="center">
  <strong>专业的 Emby / Jellyfin 媒体服务器管理与运维中枢</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/MUI-6-blue?style=for-the-badge&logo=mui" alt="MUI" />
  <img src="https://img.shields.io/badge/Docker-Supported-blue?style=for-the-badge&logo=docker" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
</p>

---

## 🚀 项目简介

**FlixPilot** 是一款专为流媒体服务器（Emby / Jellyfin）打造的进阶管理面板。它不仅提供了完善的用户管理与流量统计功能，更深度整合了**追剧日历**、**智能化缺集审计**、**媒体运维中心**等 Pro 级特性，致力于为私有云媒体用户提供极致的自动化管理体验。

---

## ✨ 核心特性

### 🛠️ 媒体运维中心 (Media Ops)
- **智能化缺集管理 (Gap Management)**
  - **高迸发扫码引擎**：服务端 30+ 并发线程，结合“总集数差值”秒杀跳过逻辑，数秒内完成数百部剧集的深度比对。
  - **水平卡片看板**：沉浸式集数矩阵，直观展示每一季、每一集的缺失状态。
  - **下载器精准拦截**：支持 qBittorrent / Transmission，拦截种子任务并精确切除非必要文件，节省带宽与空间。
- **追剧日历 (Airing Calendar)**
  - **双色库存标记**：实时比对 Emby 库，绿色代表已入库，橙/蓝/红代表今日播出、未来期待与历史缺失。
  - **SxxExx 全覆盖**：所有条目均带季集标识，支持一键查看剧集详情与播出进度。
- **品质分析 (Library Audit)**
  - **深度元数据审计**：自动统计全库分辨率、编码格式（HDR/DV/H265等）以及文件空间占比，发现低质量冗余。

### 👥 进阶用户管理
- **流控与计费**：深度对接 GoEdge 流量日志，支持倍数系数计算与会员有效期自动同步。
- **播放监控与排行**：实时监控服务器会话，统计全站播放趋势与热门内容建议。
- **现代化邀请系统**：支持注册邀请码、自定义头像（DiceBear/DiceBear/Gravatar 智能代理）。

### 🧩 插件与扩展性
- **HDHive 插件**：内置自动签到、Cookie 在线验证与 Cron 任务调度，日志实时可查。
- **网络与代理驱动**：支持 TMDB / Telegram 全局代理注入，解决国内环境下的 API 连通性痛点。

---

## 📸 界面预览

````carousel
![缺集管理 - 高并发引擎](/Users/huanhq/.gemini/antigravity/brain/e904bf69-48b5-40db-986f-e98b282cdc49/gap_manage_v006_engine_proof_png_1772968717789.png)
<!-- slide -->
![追剧日历 - 实时同步](/Users/huanhq/.gemini/antigravity/brain/e904bf69-48b5-40db-986f-e98b282cdc49/calendar_verification_full_1772868321768.png)
<!-- slide -->
![水平卡片布局](/Users/huanhq/.gemini/antigravity/brain/e904bf69-48b5-40db-986f-e98b282cdc49/gap_manage_horizontal_layout_proof_png_1772941299968.png)
````

---

## 🐳 Docker 部署

推荐使用 **Docker Compose** 进行一键部署：

```yaml
services:
  flixpilot:
    image: huanhq99/flixpilot:latest
    container_name: flixpilot
    restart: unless-stopped
    ports:
      - "3005:3005"
    volumes:
      - ./data:/app/data
    environment:
      - NODE_ENV=production
      - DATA_DIR=/app/data
      - TZ=Asia/Shanghai
```

```bash
docker compose up -d
```

---

## 🔧 技术选型

- **Frontend**: [Next.js 16](https://nextjs.org/) (App Router), React 18, [MUI 6](https://mui.com/)
- **Backend**: Node.js, Next.js API Routes, `undici` (Proxy)
- **Styling**: Tailwind CSS, Emotion
- **Tools**: Docker Multi-Arch Build (AMD64/ARM64)

---

## 📄 许可证

本项目采用 [MIT License](LICENSE) 许可协议。

---

## 🙏 致谢

感谢以下项目提供的技术支持：
[Emby](https://emby.media/), [Jellyfin](https://jellyfin.org/), [TMDB](https://www.themoviedb.org/), [Material UI](https://mui.com/).
