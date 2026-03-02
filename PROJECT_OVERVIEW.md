# FlixPilot 项目总览（2025-12-16）

## 项目定位
FlixPilot 是一个面向 Emby 媒体服务器的全功能流媒体管理平台，集成了用户管理、流量统计、媒体库同步、缺集统计、公告推送、第三方服务对接等多种功能，支持 Docker 部署，前后端一体，适合个人或小型团队自建流媒体站点。

---

## 目录结构（核心部分）

```
data/
  config.json                # 全局配置（站点、Emby、GoEdge、邮箱等）
  emby-traffic.json          # Emby 用户流量统计数据
  ...（各类业务数据JSON）

public/
  images/                    # 头像、插画、页面图片等静态资源

src/
  app/
    (dashboard)/
      user-manage/           # 用户管理页面（流量、会员、活跃、批量操作等）
      settings/              # 全局设置页面（Emby、GoEdge、邮箱、主题等）
      ...（其他后台页面）
    api/
      traffic/
        sync/route.ts        # GoEdge流量同步API（MySQL日志→用户流量）
        report/route.ts      # 流量查询/上报API
      ...（其他API接口）
    ...（前端页面、全局样式等）
  @core/                     # 组件、hooks、上下文、工具函数等
  @layouts/                  # 页面布局
  @menu/                     # 菜单配置与组件
  components/                # 通用组件
  lib/                       # 业务逻辑库（Emby、GoEdge、邮件、Redis等）
  services/                  # 外部服务接口
  types/                     # 类型定义
  utils/                     # 工具函数
  views/                     # 主要页面视图
```

---

## 主要功能模块

### 1. 用户管理
- 支持本地用户与 Emby 用户绑定
- 展示用户基本信息、会员状态、活跃天数、爆米花积分
- 支持批量操作（批量删除、批量设置白名单、批量设置会员到期等）
- 支持 Emby 用户的流量统计（当月/累计/历史）

### 2. Emby 媒体库同步
- 支持定时与手动同步 Emby 媒体库
- 支持多 Emby 服务器配置
- 支持媒体库缺集统计（剧集、电影、综艺等）

### 3. GoEdge 流量统计
- 后台可配置 GoEdge MySQL 日志数据库
- 支持“增量同步”与“完整同步”所有历史日志
- 自动识别 Emby 用户流量（支持 X-Emby-Authorization 头和 URL api_key）
- 支持按月、累计、历史流量统计
- 支持流量上报 API（可对接其他CDN/Nginx）

### 4. 会员与积分系统
- 支持会员到期、白名单、爆米花积分
- 支持积分兑换流量、兑换求片额度
- 支持会员到期提醒、积分变动通知

### 5. 公告与推送
- 支持站内公告推送
- 支持 Telegram Bot 推送
- 支持邮件通知（到期、求片、订阅等）

### 6. 其他功能
- 支持多主题、暗黑模式
- 支持多语言
- 支持 Docker 一键部署
- 支持自定义菜单、首页模块
- 支持第三方 MoviePilot、TMDB、Redis 等服务对接

---

## 技术栈
- 前端：Next.js + React + MUI + TailwindCSS
- 后端：Next.js API 路由 + Node.js
- 数据存储：JSON 文件（本地）、MySQL（GoEdge 日志）、Redis（可选）
- 部署：Docker（支持多平台）、Docker Compose

---

## 典型业务流程

1. **用户注册/登录** → 绑定 Emby 账号 → 进入后台管理
2. **媒体库同步** → 定时/手动同步 Emby 媒体库 → 缺集统计
3. **流量统计** → 配置 GoEdge MySQL → 同步日志 → 展示用户流量
4. **会员管理** → 设置会员、白名单、积分 → 到期/变动通知
5. **公告推送** → 后台发布公告 → 用户端展示/推送
6. **设置管理** → 全局配置（Emby、GoEdge、邮箱、主题等）

---

## 关键配置文件说明

- `data/config.json`：全局配置，包含站点信息、Emby服务器、GoEdge MySQL、邮箱、Telegram等
- `data/emby-traffic.json`：用户流量统计数据，结构支持月度、累计、历史
- `src/app/api/traffic/sync/route.ts`：GoEdge流量同步主逻辑，支持多种日志格式
- `src/app/(dashboard)/settings/page.tsx`：后台设置页面，支持所有核心配置项

---

## 典型部署命令

```bash
docker pull huanhq99/flixpilot:latest
docker stop flixpilot && docker rm flixpilot
docker run -d --name flixpilot --network mysql_network -p 3009:3005 \
  -v /opt/flixpilot/data:/app/data \
  -v /opt/flixpilot/public/images:/app/public/images \
  --restart unless-stopped huanhq99/flixpilot:latest
```

---

## 维护与二次开发建议

- 任何新功能建议先在 `src/app/(dashboard)/settings/page.tsx` 配置入口
- 流量统计相关逻辑集中在 `src/app/api/traffic/sync/route.ts`
- 用户/会员/积分相关逻辑集中在 `src/app/(dashboard)/user-manage/`
- 组件、hooks、工具函数统一放在 `@core/` 下，便于复用
- 业务数据建议都用 JSON 存在 `data/` 下，便于备份和迁移

---

如需详细代码结构、接口文档或具体某一模块的说明，可随时补充！
