# StreamHub 安全配置指南

## 🔒 安全特性

StreamHub 已实施以下安全措施保护您的敏感信息:

### 1. TMDB API 保护
- ✅ **前端零暴露**: TMDB API Key 完全存储在后端
- ✅ **代理架构**: 所有 TMDB 请求通过后端 `/tmdb` 端点代理
- ✅ **网络隐藏**: 浏览器开发者工具无法看到 API Key

**实现方式:**
```javascript
// ❌ 旧方式 (不安全)
fetch(`https://api.themoviedb.org/3/movie/123?api_key=${YOUR_KEY}`)

// ✅ 新方式 (安全)
fetch('/tmdb/movie/123?language=zh-CN')
// 后端自动添加 API Key
```

### 2. MoviePilot API 保护
- ✅ **JWT Token 保护**: 登录凭据仅在认证时使用
- ✅ **代理请求**: 通过后端 `/api/proxy/moviepilot` 代理
- ✅ **无直连**: 前端不直接访问 MoviePilot 服务器

### 3. Emby API 当前状态
- ⚠️ **需要注意**: Emby API Key 目前存储在浏览器 localStorage
- ⚠️ **可见性**: 有技术能力的用户可以在开发者工具中查看
- 💡 **建议**: 使用 Emby 的用户权限系统限制 API Key 权限

## 🛡️ 部署安全最佳实践

### 生产环境配置

1. **使用环境变量 (必须)**
```bash
# .env 文件 (不要提交到 git)
TMDB_API_KEY=your_tmdb_api_key_here
EMBY_SERVER_URL=https://your-emby-server.com
EMBY_API_KEY=your_emby_api_key_here
MOVIEPILOT_URL=https://your-moviepilot.com
```

2. **确保 .env 在 .gitignore 中**
```gitignore
.env
.env.local
.env.production
```

3. **使用反向代理 (推荐)**
```nginx
# Nginx 配置示例
location /streamhub/ {
    proxy_pass http://localhost:3000/;
    proxy_hide_header X-Powered-By;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
}
```

### Docker 部署安全

```yaml
# docker-compose.yml
services:
  streamhub:
    image: streamhub:latest
    environment:
      - TMDB_API_KEY=${TMDB_API_KEY}
      - EMBY_SERVER_URL=${EMBY_SERVER_URL}
      - EMBY_API_KEY=${EMBY_API_KEY}
    env_file:
      - .env  # 包含敏感信息的文件
    restart: unless-stopped
```

## 🔍 安全检查清单

在部署前,请确认:

- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] 生产环境使用环境变量而非硬编码
- [ ] Emby API Key 权限已限制(只读权限)
- [ ] MoviePilot 使用独立的受限用户账号
- [ ] 启用了 HTTPS (生产环境必须)
- [ ] 后端服务器有防火墙保护
- [ ] 定期轮换 API Keys

## 📝 许可证与免责声明

本项目仅供学习和个人使用。用户需要:
- 遵守 TMDB API 使用条款
- 遵守 Emby 使用许可
- 确保不公开分享包含敏感信息的配置文件

## 🚨 发现安全问题?

如果您发现安全漏洞,请:
1. **不要公开发布** issue
2. 直接联系项目维护者
3. 提供详细的问题描述和复现步骤

---

**最后更新**: 2025-01-25  
**版本**: v2.1.16+
