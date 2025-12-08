#!/usr/bin/env python3
"""
GoEdge 流量统计脚本
从 GoEdge MySQL 读取访问日志，统计 Emby 用户流量并上报到 FlixPilot

使用方法：
1. 修改下面的配置
2. 安装依赖: pip install mysql-connector-python requests
3. 添加到 crontab: */5 * * * * /usr/bin/python3 /opt/goedge-traffic-sync.py >> /var/log/goedge-traffic.log 2>&1
"""

import mysql.connector
import requests
import json
import re
import os
from datetime import datetime, timedelta

# ============ 配置区域（请修改）============

# GoEdge MySQL 配置
GOEDGE_MYSQL = {
    'host': '127.0.0.1',
    'port': 3306,
    'user': 'mysql',
    'password': 'clqDt1RMkYD28Xm61xpi',
    'database': 'mysql'
}

# Emby 域名（用于筛选日志）
EMBY_DOMAIN = 'emby.bmh.best'

# FlixPilot 配置
FLIXPILOT_URL = 'https://flixpilot.bmh.best'
FLIXPILOT_TRAFFIC_KEY = 'flixpilot-traffic-key'

# 状态文件（记录上次处理的 ID）
STATE_FILE = '/tmp/goedge_traffic_state.json'

# ============ 代码区域（无需修改）============

def load_state():
    """加载上次处理状态"""
    try:
        with open(STATE_FILE, 'r') as f:
            return json.load(f)
    except:
        return {'last_id': 0, 'date': datetime.now().strftime('%Y%m%d')}

def save_state(state):
    """保存处理状态"""
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)

def extract_user_id(content):
    """从日志 content 中提取 Emby UserId"""
    try:
        # 从 X-Emby-Authorization header 中提取 UserId
        header = content.get('header', {})
        auth_header = header.get('X-Emby-Authorization', {}).get('values', [])
        
        for auth in auth_header:
            # 匹配 UserId="xxx" 格式
            match = re.search(r'UserId="([a-fA-F0-9]+)"', auth)
            if match:
                return match.group(1)
        
        return None
    except:
        return None

def get_table_name(date_str):
    """获取指定日期的日志表名"""
    return f'edgeHTTPAccessLogs_{date_str}'

def query_logs(conn, table_name, last_id, domain):
    """查询视频流日志"""
    cursor = conn.cursor(dictionary=True)
    
    query = f"""
        SELECT id, content
        FROM {table_name}
        WHERE id > %s
          AND domain = %s
          AND JSON_EXTRACT(content, '$.requestPath') LIKE '%%/videos/%%'
          AND JSON_EXTRACT(content, '$.bytesSent') > 0
        ORDER BY id ASC
        LIMIT 5000
    """
    
    cursor.execute(query, (last_id, domain))
    logs = cursor.fetchall()
    cursor.close()
    
    return logs

def report_to_flixpilot(traffic_data):
    """上报流量到 FlixPilot"""
    if not traffic_data:
        print('No traffic data to report')
        return True
    
    reports = [
        {
            'embyUserId': user_id,
            'bytes': int(bytes_sent),
            'type': 'download'
        }
        for user_id, bytes_sent in traffic_data.items()
    ]
    
    try:
        resp = requests.post(
            f'{FLIXPILOT_URL}/api/traffic/report',
            headers={
                'Authorization': f'Bearer {FLIXPILOT_TRAFFIC_KEY}',
                'Content-Type': 'application/json'
            },
            json={'reports': reports},
            timeout=30
        )
        
        if resp.status_code == 200:
            print(f'Successfully reported {len(reports)} users')
            return True
        else:
            print(f'Report failed: {resp.status_code} {resp.text}')
            return False
            
    except Exception as e:
        print(f'Report error: {e}')
        return False

def process_date(conn, date_str, last_id):
    """处理指定日期的日志"""
    table_name = get_table_name(date_str)
    
    # 检查表是否存在
    cursor = conn.cursor()
    cursor.execute(f"SHOW TABLES LIKE '{table_name}'")
    if not cursor.fetchone():
        cursor.close()
        print(f'Table {table_name} not found')
        return last_id, {}
    cursor.close()
    
    print(f'Processing table: {table_name}, last_id: {last_id}')
    
    logs = query_logs(conn, table_name, last_id, EMBY_DOMAIN)
    print(f'Found {len(logs)} video request logs')
    
    traffic_by_user = {}
    max_id = last_id
    
    for log in logs:
        log_id = log['id']
        max_id = max(max_id, log_id)
        
        # 解析 content JSON
        try:
            content = log['content']
            if isinstance(content, str):
                content = json.loads(content)
        except:
            continue
        
        # 提取 UserId
        user_id = extract_user_id(content)
        if not user_id:
            continue
        
        # 获取字节数
        bytes_sent = content.get('bytesSent', 0) or content.get('bodyBytesSent', 0)
        if bytes_sent > 0:
            traffic_by_user[user_id] = traffic_by_user.get(user_id, 0) + bytes_sent
    
    return max_id, traffic_by_user

def main():
    print(f'\n[{datetime.now()}] Starting traffic sync...')
    
    # 加载状态
    state = load_state()
    today = datetime.now().strftime('%Y%m%d')
    
    # 如果日期变了，重置 last_id
    if state.get('date') != today:
        print(f'New day detected, resetting last_id')
        state = {'last_id': 0, 'date': today}
    
    last_id = state.get('last_id', 0)
    
    try:
        conn = mysql.connector.connect(**GOEDGE_MYSQL)
        print('Connected to MySQL')
        
        # 处理今天的日志
        new_last_id, traffic_data = process_date(conn, today, last_id)
        
        conn.close()
        
        if traffic_data:
            print(f'\nTraffic summary:')
            for user_id, bytes_sent in traffic_data.items():
                print(f'  {user_id}: {bytes_sent / 1024 / 1024:.2f} MB')
            
            # 上报到 FlixPilot
            if report_to_flixpilot(traffic_data):
                state['last_id'] = new_last_id
                state['date'] = today
                save_state(state)
                print(f'State saved: last_id={new_last_id}')
        else:
            print('No new traffic data')
            state['last_id'] = new_last_id
            state['date'] = today
            save_state(state)
            
    except mysql.connector.Error as e:
        print(f'MySQL Error: {e}')
    except Exception as e:
        print(f'Error: {e}')
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()
