# 配置说明 (Configuration Guide)

## 📋 配置方式选择

StreamHub 支持两种配置方式,您可以选择更方便的一种:

### 方式 1: config.json (推荐 ✨)
- ✅ **易于编辑**: JSON 格式清晰,支持注释和结构化配置
- ✅ **一目了然**: 所有配置集中在一个文件,方便管理
- ✅ **灵活**: 支持嵌套配置,可以分类管理不同服务
- ✅ **热更新**: 修改后重启服务即可生效

### 方式 2: .env (传统方式)
- ✅ **简单**: 适合简单的键值对配置
- ✅ **兼容**: 与大多数部署平台兼容
- ⚠️ **限制**: 只支持扁平化的键值对

---

## 🚀 快速开始

### 使用 config.json (推荐)

1. **复制示例文件**
   ```bash
   cp config.example.json config.json
   ```

2. **编辑配置**
   ```bash
   nano config.json
   # 或使用您喜欢的编辑器
   ```

3. **填写必要信息**
   ```json
   {
     "tmdb": {
       "apiKey": "你的TMDB API Key"
     },
     "emby": {
       "serverUrl": "http://你的Emby地址:8096",
       "apiKey": "你的Emby API Key"
     },
     "moviepilot": {
       "url": "https://你的MoviePilot地址",
       "username": "用户名",
       "password": "密码",
       "subscribeUser": "hub"
     }
   }
   ```

4. **启动服务**
   ```bash
   node server.js
   ```
   
   看到 `✅ 已加载 config.json 配置文件` 表示成功!

---

## 📝 详细配置说明

### TMDB 配置 (必需)

```json
{
  "tmdb": {
    "apiKey": "你的API Key",
    "baseUrl": "https://api.themoviedb.org/3"
  }
}
```

- **apiKey**: 从 [TMDB官网](https://www.themoviedb.org/settings/api) 获取
- **baseUrl**: TMDB API 基础地址,通常不需要修改

### Emby 配置 (可选)

```json
{
  "emby": {
    "serverUrl": "http://192.168.1.100:8096",
    "apiKey": "你的API Key"
  }
}
```

- **serverUrl**: Emby 服务器地址
- **apiKey**: 在 Emby 设置 → API 密钥中生成

### MoviePilot 配置 (可选)

```json
{
  "moviepilot": {
    "url": "https://moviepilot.example.com",
    "username": "admin",
    "password": "your_password",
    "subscribeUser": "hub"
  }
}
```

- **url**: MoviePilot 服务器地址
- **username**: 登录用户名
- **password**: 登录密码
- **subscribeUser**: 订阅时使用的用户名 (可选,默认为登录用户名)

### 服务器配置 (可选)

```json
{
  "server": {
    "port": 3000,
    "dataDir": "./data"
  }
}
```

- **port**: 服务器端口
- **dataDir**: 数据存储目录

### 代理配置 (可选)

```json
{
  "proxy": {
    "http": "http://proxy.example.com:8080",
    "https": "http://proxy.example.com:8080"
  }
}
```

---

## 🔒 安全性说明

### ✅ 安全存储 (config.json)

`config.json` 文件已被添加到 `.gitignore`,**不会被提交到 Git**:

- ✅ API Keys 不会泄露到 GitHub
- ✅ 密码不会被上传
- ✅ 服务器地址保持私密

### ⚠️ 重要提醒

1. **切勿分享** `config.json` 文件
2. **定期更换** API Keys 和密码
3. **使用强密码** 保护 MoviePilot 账户
4. **备份配置** 但不要提交到公共仓库

---

## 🔄 配置优先级

当同时存在多种配置时,优先级为:

```
config.json > .env > 默认值
```

**示例:**

```json
// config.json (优先级最高)
{
  "server": {
    "port": 3000
  }
}
```

```bash
# .env (次优先级)
PORT=5000
```

**结果**: 服务器运行在端口 `3000` (config.json 优先)

---

## 🐳 Docker 部署配置

### 方式 1: 使用 config.json (推荐)

```bash
docker run -d \
  --name streamhub \
  -p 3007:3000 \
  -v $(pwd)/config.json:/app/config.json \
  -v $(pwd)/data:/app/data \
  streamhub
```

### 方式 2: 使用环境变量

```bash
docker run -d \
  --name streamhub \
  -p 3007:3000 \
  -e TMDB_API_KEY=your_key \
  -v $(pwd)/data:/app/data \
  streamhub
```

### Docker Compose

```yaml
version: '3'
services:
  streamhub:
    image: streamhub
    ports:
      - "3007:3000"
    volumes:
      - ./config.json:/app/config.json  # 配置文件
      - ./data:/app/data                # 数据目录
    restart: unless-stopped
```

---

## ❓ 常见问题

### Q: config.json 不存在怎么办?

**A:** 系统会自动使用 `.env` 或默认配置,不影响运行。你可以随时创建 `config.json` 来覆盖默认值。

### Q: 如何查看当前使用的配置?

**A:** 启动服务时会显示:
```
✅ 已加载 config.json 配置文件
```
或
```
ℹ️  未找到 config.json,使用 .env 或默认配置
```

### Q: config.json 修改后需要重启吗?

**A:** 是的,修改 `config.json` 后需要重启服务器才能生效。

### Q: config.json 和 .env 可以同时使用吗?

**A:** 可以! config.json 的配置会覆盖 .env 中的相同配置。

### Q: 如何只配置部分选项?

**A:** 你只需要在 config.json 中添加需要修改的配置即可:

```json
{
  "tmdb": {
    "apiKey": "only_this_is_required"
  }
}
```

其他配置会使用默认值。

---

## 📚 配置模板

### 最小配置 (只使用 TMDB)

```json
{
  "tmdb": {
    "apiKey": "your_tmdb_api_key"
  }
}
```

### 完整配置 (所有功能)

```json
{
  "tmdb": {
    "apiKey": "your_tmdb_api_key",
    "baseUrl": "https://api.themoviedb.org/3"
  },
  "emby": {
    "serverUrl": "http://192.168.1.100:8096",
    "apiKey": "your_emby_api_key"
  },
  "moviepilot": {
    "url": "https://moviepilot.example.com",
    "username": "admin",
    "password": "your_password",
    "subscribeUser": "hub"
  },
  "server": {
    "port": 3000,
    "dataDir": "./data"
  },
  "proxy": {
    "http": "",
    "https": ""
  }
}
```

---

## 🆘 需要帮助?

- 📖 查看 [README.md](README.md) 了解项目整体说明
- 🔒 查看 [SECURITY.md](SECURITY.md) 了解安全最佳实践
- 🐛 遇到问题? [提交 Issue](https://github.com/huanhq99/StreamHub/issues)
