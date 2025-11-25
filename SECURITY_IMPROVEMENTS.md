# StreamHub v2.1.17 安全改进

## 🔒 本次更新的安全增强

### 1. TMDB API 完全隐藏 ✅

**问题**: TMDB API Key 之前可能在前端代码或网络请求中暴露

**解决方案**:
- 移除所有前端对 `TMDB_API_KEY` 的直接引用
- 所有 TMDB 请求统一通过 `/tmdb` 后端代理
- API Key 仅存储在服务器端环境变量中

**影响的文件**:
- `constants.ts` - 移除 API Key 配置
- `services/tmdbService.ts` - 所有请求移除 `api_key` 参数
- `App.tsx` - 搜索/浏览功能改用代理

**验证方法**:
```bash
# 在浏览器开发者工具的 Network 标签中
# 你将看到:
GET /tmdb/movie/123?language=zh-CN  ✅ 安全

# 而不是:
GET https://api.themoviedb.org/3/movie/123?api_key=xxxxx  ❌ 不安全
```

### 2. MoviePilot API 保护 ✅

**当前状态**: 
- ✅ 所有请求通过 `/api/proxy/moviepilot` 代理
- ✅ JWT Token 动态获取,不硬编码
- ✅ 使用 MCP Tools API 降低暴露风险

### 3. Emby API 当前状态 ⚠️

**现状**: 
- Emby API Key 仍存储在浏览器 localStorage
- 技术用户可以通过开发者工具查看

**缓解措施**:
1. 使用 Emby 用户权限系统限制 API Key 权限
2. 为 StreamHub 创建单独的只读 Emby 用户
3. 定期轮换 API Keys

**未来计划** (可选):
- 实现 Emby 后端代理(类似 TMDB)
- 所有 Emby 请求通过后端转发

### 4. 配置文件安全 ✅

**新增文件**:
- `.env.example` - 环境变量模板
- `SECURITY.md` - 安全配置指南

**更新文件**:
- `.gitignore` - 确保敏感文件不被提交
  ```gitignore
  .env
  .env.local
  .env.production
  env-config.js
  data/
  *.db
  ```

- `README.md` - 添加安全部署说明

## 📋 安全检查清单

部署前请确认:

- [ ] 已创建 `.env` 文件(从 `.env.example` 复制)
- [ ] TMDB_API_KEY 已配置在 `.env` 中
- [ ] `.env` 文件在 `.gitignore` 中
- [ ] 生产环境使用 HTTPS
- [ ] Emby API Key 权限已限制为只读
- [ ] MoviePilot 使用受限用户账号
- [ ] 定期轮换所有 API Keys

## 🚀 升级指南

### 从旧版本升级

1. **更新代码**
```bash
git pull origin main
npm install
```

2. **创建环境变量文件**
```bash
cp .env.example .env
nano .env  # 填入你的 API Keys
```

3. **重启服务**
```bash
# Docker
docker-compose down
docker-compose up -d

# 或手动运行
npm run dev  # 开发环境
npm run build && node server.js  # 生产环境
```

### 验证安全性

1. 打开浏览器开发者工具(F12)
2. 切换到 Network 标签
3. 刷新页面或浏览电影
4. 检查请求:
   - ✅ 应该看到: `/tmdb/...`
   - ❌ 不应该看到: `api_key=...` 参数

## 🔍 技术细节

### 代理实现

后端 `server.js` 自动处理:
```javascript
// TMDB 代理
app.use('/tmdb', (req, res) => {
    const tmdbUrl = `https://api.themoviedb.org/3${req.path}`;
    const params = new URLSearchParams(req.query);
    params.set('api_key', process.env.TMDB_API_KEY); // 后端添加
    // ... 转发请求
});
```

### 前端调用示例

**之前** (不安全):
```typescript
fetch(`https://api.themoviedb.org/3/movie/123?api_key=${key}`)
```

**现在** (安全):
```typescript
fetch('/tmdb/movie/123?language=zh-CN')
// 后端自动添加 API Key
```

## 📈 下一步改进 (可选)

1. **Emby 后端代理** - 完全隐藏 Emby API Key
2. **Rate Limiting** - 防止 API 滥用
3. **请求缓存** - 减少对外部 API 的调用
4. **审计日志** - 记录所有 API 访问

---

**版本**: v2.1.17  
**发布日期**: 2025-01-25  
**重要性**: 🔴 高 - 建议所有用户升级
