# Emby CDN 流量统计配置说明

## 方案概述

FlixPilot 提供了一个流量上报 API，你的 CDN (edge-admin/Nginx) 可以将 Emby 用户的流量统计上报到这个接口。

## API 接口

### 上报流量
```
POST /api/traffic/report
Authorization: Bearer flixpilot-traffic-key

# 单条上报
{
  "embyUserId": "用户ID",
  "bytes": 12345678,
  "type": "download"  // download 或 upload
}

# 批量上报
{
  "reports": [
    { "embyUserId": "用户ID1", "bytes": 12345678, "type": "download" },
    { "embyUserId": "用户ID2", "bytes": 87654321, "type": "download" }
  ]
}
```

### 查询流量
```
GET /api/traffic/report                    # 查询所有用户
GET /api/traffic/report?embyUserId=xxx     # 查询单个用户
```

## 配置方法

### 方案 1: 定时解析 Nginx Access Log（推荐）

在你的服务器上创建一个定时任务，定期解析 Nginx 日志并上报到 FlixPilot。

#### 1. 配置 Nginx 日志格式

在 nginx.conf 中添加自定义日志格式：

```nginx
log_format emby_traffic '$remote_addr - $remote_user [$time_local] '
                        '"$request" $status $body_bytes_sent '
                        '"$http_referer" "$http_user_agent" '
                        '$request_uri $bytes_sent';
```

#### 2. 创建解析脚本

创建 `/opt/emby-traffic-report.sh`:

```bash
#!/bin/bash

FLIXPILOT_URL="https://your-flixpilot-domain.com"
TRAFFIC_KEY="flixpilot-traffic-key"
LOG_FILE="/var/log/nginx/emby_access.log"
LAST_POS_FILE="/tmp/emby_traffic_pos"

# 获取上次处理的位置
if [ -f "$LAST_POS_FILE" ]; then
    LAST_POS=$(cat "$LAST_POS_FILE")
else
    LAST_POS=0
fi

# 获取当前文件大小
CURRENT_SIZE=$(stat -c%s "$LOG_FILE" 2>/dev/null || stat -f%z "$LOG_FILE")

# 如果文件被轮转了（当前大小小于上次位置），从头开始
if [ "$CURRENT_SIZE" -lt "$LAST_POS" ]; then
    LAST_POS=0
fi

# 提取新增的日志行并解析
tail -c +$((LAST_POS + 1)) "$LOG_FILE" | while read line; do
    # 从 URL 中提取 UserId 参数
    # Emby URL 格式通常是: /emby/Videos/xxx/stream?UserId=xxx&api_key=xxx
    USER_ID=$(echo "$line" | grep -oP 'UserId=\K[^&\s"]+' | head -1)
    BYTES=$(echo "$line" | awk '{print $(NF)}')
    
    if [ -n "$USER_ID" ] && [ -n "$BYTES" ] && [ "$BYTES" -gt 0 ] 2>/dev/null; then
        # 上报到 FlixPilot
        curl -s -X POST "$FLIXPILOT_URL/api/traffic/report" \
            -H "Authorization: Bearer $TRAFFIC_KEY" \
            -H "Content-Type: application/json" \
            -d "{\"embyUserId\": \"$USER_ID\", \"bytes\": $BYTES, \"type\": \"download\"}"
    fi
done

# 记录当前位置
echo "$CURRENT_SIZE" > "$LAST_POS_FILE"
```

#### 3. 添加定时任务

```bash
# 每5分钟执行一次
*/5 * * * * /opt/emby-traffic-report.sh >> /var/log/emby-traffic.log 2>&1
```

### 方案 2: 使用 Nginx Lua 模块实时上报

如果你的 Nginx 编译了 lua-nginx-module，可以实时上报：

```nginx
location ~ ^/emby/Videos/ {
    # 原有的代理配置
    proxy_pass http://emby_backend;
    
    # 在响应完成后统计流量
    log_by_lua_block {
        local bytes = tonumber(ngx.var.bytes_sent) or 0
        if bytes > 0 then
            -- 从 URL 参数提取 UserId
            local user_id = ngx.var.arg_UserId
            if user_id then
                -- 异步上报（不阻塞请求）
                ngx.timer.at(0, function()
                    local http = require "resty.http"
                    local httpc = http.new()
                    httpc:request_uri("http://127.0.0.1:3000/api/traffic/report", {
                        method = "POST",
                        headers = {
                            ["Content-Type"] = "application/json",
                            ["Authorization"] = "Bearer flixpilot-traffic-key"
                        },
                        body = '{"embyUserId":"' .. user_id .. '","bytes":' .. bytes .. ',"type":"download"}'
                    })
                end)
            end
        end
    }
}
```

### 方案 3: 使用 Python 脚本批量解析（更灵活）

创建 `/opt/emby-traffic-report.py`:

```python
#!/usr/bin/env python3
import re
import json
import requests
from pathlib import Path

FLIXPILOT_URL = "https://your-flixpilot-domain.com"
TRAFFIC_KEY = "flixpilot-traffic-key"
LOG_FILE = "/var/log/nginx/emby_access.log"
STATE_FILE = "/tmp/emby_traffic_state.json"

def load_state():
    try:
        with open(STATE_FILE) as f:
            return json.load(f)
    except:
        return {"pos": 0, "inode": 0}

def save_state(state):
    with open(STATE_FILE, "w") as f:
        json.dump(state, f)

def parse_log():
    state = load_state()
    log_path = Path(LOG_FILE)
    
    if not log_path.exists():
        return
    
    current_inode = log_path.stat().st_ino
    current_size = log_path.stat().st_size
    
    # 文件被轮转
    if current_inode != state["inode"]:
        state["pos"] = 0
        state["inode"] = current_inode
    
    # 没有新数据
    if current_size <= state["pos"]:
        return
    
    traffic_data = {}
    
    with open(LOG_FILE, "rb") as f:
        f.seek(state["pos"])
        for line in f:
            line = line.decode("utf-8", errors="ignore")
            
            # 提取 UserId
            match = re.search(r'UserId=([^&\s"]+)', line)
            if not match:
                continue
            
            user_id = match.group(1)
            
            # 提取字节数（假设在日志末尾）
            parts = line.split()
            try:
                bytes_sent = int(parts[-1]) if parts else 0
            except:
                continue
            
            if bytes_sent > 0:
                traffic_data[user_id] = traffic_data.get(user_id, 0) + bytes_sent
        
        state["pos"] = f.tell()
    
    # 批量上报
    if traffic_data:
        reports = [
            {"embyUserId": uid, "bytes": b, "type": "download"}
            for uid, b in traffic_data.items()
        ]
        
        try:
            resp = requests.post(
                f"{FLIXPILOT_URL}/api/traffic/report",
                headers={
                    "Authorization": f"Bearer {TRAFFIC_KEY}",
                    "Content-Type": "application/json"
                },
                json={"reports": reports},
                timeout=10
            )
            print(f"Reported {len(reports)} users, status: {resp.status_code}")
        except Exception as e:
            print(f"Report failed: {e}")
    
    save_state(state)

if __name__ == "__main__":
    parse_log()
```

## 配置密钥

在 FlixPilot 的环境变量中设置自定义密钥（可选）：

```env
TRAFFIC_REPORT_KEY=your-custom-secret-key
```

默认密钥是 `flixpilot-traffic-key`。

## 验证

配置完成后，在 FlixPilot 用户管理页面的 Emby 用户列表中，应该能看到每个用户的流量统计。
