import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Version info
const VERSION = '2.1.31';
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8'));
if (packageJson.version !== VERSION) {
  console.log(`\n⚠️  版本不匹配: package.json (${packageJson.version}) vs server.js (${VERSION})`);
  console.log(`📝 建议更新 package.json 中的版本号\n`);
}

// Load configuration from config.json (fallback to .env)
let config = {
  tmdb: {
    apiKey: process.env.TMDB_API_KEY || '',
    baseUrl: 'https://api.themoviedb.org/3'
  },
  server: {
    port: parseInt(process.env.PORT) || 3000,
    dataDir: process.env.DATA_DIR || path.join(__dirname, 'data')
  },
  proxy: {
    http: process.env.HTTP_PROXY || '',
    https: process.env.HTTPS_PROXY || ''
  }
};

// 配置文件路径 - 优先使用 data 目录下的配置 (方便 Docker 挂载)
const DATA_DIR_ENV = process.env.DATA_DIR || path.join(__dirname, 'data');

// Ensure data directory exists first
if (!fs.existsSync(DATA_DIR_ENV)) {
    fs.mkdirSync(DATA_DIR_ENV, { recursive: true });
}

// 配置文件查找顺序: data/config.json > ./config.json
const configInData = path.join(DATA_DIR_ENV, 'config.json');
const configInRoot = path.join(__dirname, 'config.json');
const configPath = fs.existsSync(configInData) ? configInData : 
                   fs.existsSync(configInRoot) ? configInRoot : configInData; // 默认生成到 data 目录

let isFirstRun = false;

// Auto-generate default config.json if not exists
if (!fs.existsSync(configInData) && !fs.existsSync(configInRoot)) {
  isFirstRun = true;
  console.log('\n🔧 首次运行检测到，正在生成默认配置文件...');
  
  const defaultConfig = {
    "_说明": "StreamHub 配置文件 - 修改后需重启服务",
    "tmdb": {
      "apiKey": "your_tmdb_api_key_here",
      "_获取地址": "https://www.themoviedb.org/settings/api"
    },
    "emby": {
      "serverUrl": "http://your-emby-server:8096",
      "serverUrlInternal": "",
      "serverUrlExternal": "",
      "apiKey": "your_emby_api_key_here",
      "_说明": "可选配置，用于媒体库同步和播放统计"
    },
    "moviepilot": {
      "url": "https://your-moviepilot-server.com",
      "username": "your_username",
      "password": "your_password",
      "subscribeUser": "hub",
      "_说明": "可选配置，用于自动订阅下载"
    },
    "telegram": {
      "botToken": "your_bot_token_here",
      "chatId": "your_chat_id_here",
      "_说明": "可选配置，用于通知推送",
      "_获取方式": "1. @BotFather 创建机器人获取 Token; 2. @userinfobot 获取 Chat ID"
    },
    "report": {
      "enabled": false,
      "dailyTime": "23:00",
      "weeklyDay": 0,
      "weeklyTime": "22:00",
      "_说明": "观影报告自动推送配置",
      "_dailyTime": "每日报告推送时间 (HH:mm 格式，如 23:00)",
      "_weeklyDay": "周报推送星期几 (0=周日, 1=周一, ..., 6=周六)",
      "_weeklyTime": "周报推送时间 (HH:mm 格式)"
    },
    "server": {
      "port": 3000
    }
  };
  
  try {
    // 生成到 data 目录,方便 Docker 挂载持久化
    fs.writeFileSync(configInData, JSON.stringify(defaultConfig, null, 2), 'utf-8');
    console.log('✅ 已生成配置文件: data/config.json');
    console.log('📝 请编辑 data/config.json 填入您的配置');
    console.log('🔑 必需: tmdb.apiKey');
    console.log('⏸️  修改后重启服务生效\n');
  } catch (err) {
    console.error('❌ 生成配置文件失败:', err.message);
  }
}

// Load configuration
if (fs.existsSync(configPath)) {
  try {
    console.log(`📂 加载配置: ${configPath}`);
    const configFile = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    // Check if using default values
    const hasDefaultValues = 
      configFile.tmdb?.apiKey === 'your_tmdb_api_key_here' ||
      configFile.emby?.apiKey === 'your_emby_api_key_here' ||
      configFile.moviepilot?.username === 'your_username';
    
    // Merge config.json with defaults, config.json takes priority
    config = {
      ...config,
      ...configFile,
      tmdb: { ...config.tmdb, ...configFile.tmdb },
      server: { ...config.server, ...configFile.server },
      proxy: { ...config.proxy, ...configFile.proxy }
    };
    
    if (isFirstRun || hasDefaultValues) {
      console.log('⚠️  检测到默认配置，请编辑 data/config.json');
    } else {
      console.log('✅ 配置加载成功');
    }
  } catch (err) {
    console.error('⚠️  config.json 解析失败:', err.message);
  }
}

// Create an HTTPS agent that ignores SSL errors
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

const app = express();
const PORT = config.server.port;
const DATA_DIR = config.server.dataDir;
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize DB file if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({}, null, 2));
}

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'dist')));

// API: Get server configuration (for frontend)
app.get('/api/config', (req, res) => {
    try {
        // Return configuration for frontend (hide passwords)
        const isEmbyConfigured = !!config.emby?.serverUrl && config.emby?.serverUrl !== 'http://your-emby-server:8096';
        const isMPConfigured = !!config.moviepilot?.url && config.moviepilot?.url !== 'https://your-moviepilot-server.com';
        const isTelegramConfigured = !!config.telegram?.botToken && !!config.telegram?.chatId;
        
        res.json({
            version: VERSION,
            tmdb: {
                configured: !!config.tmdb.apiKey && config.tmdb.apiKey !== 'your_tmdb_api_key_here'
            },
            // 返回 Emby 完整配置给前端使用
            emby: isEmbyConfigured ? {
                configured: true,
                serverUrl: config.emby.serverUrl,
                serverUrlInternal: config.emby.serverUrlInternal || '',
                serverUrlExternal: config.emby.serverUrlExternal || '',
                apiKey: config.emby.apiKey
            } : { configured: false },
            // 返回 MoviePilot 配置给前端使用 (不返回密码)
            moviepilot: isMPConfigured ? {
                configured: true,
                url: config.moviepilot.url,
                username: config.moviepilot.username,
                // password 不返回,前端需要时单独请求
                subscribeUser: config.moviepilot.subscribeUser
            } : { configured: false },
            // 返回 Telegram 配置给前端使用
            telegram: isTelegramConfigured ? {
                configured: true,
                botToken: config.telegram.botToken,
                chatId: config.telegram.chatId
            } : { configured: false },
            // 报告配置
            report: {
                enabled: config.report?.enabled || false,
                dailyTime: config.report?.dailyTime || '23:00',
                weeklyDay: config.report?.weeklyDay ?? 0,
                weeklyTime: config.report?.weeklyTime || '22:00'
            }
        });
    } catch (error) {
        console.error('Get Config Error:', error);
        res.status(500).json({ error: 'Failed to get configuration' });
    }
});

// API: Get Data
app.get('/api/db', (req, res) => {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json({});
        }
    } catch (error) {
        console.error('Read DB Error:', error);
        res.status(500).json({ error: 'Failed to read database' });
    }
});

// API: Save Data
app.post('/api/db', (req, res) => {
    try {
        const data = req.body;
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        res.json({ success: true });
    } catch (error) {
        console.error('Write DB Error:', error);
        res.status(500).json({ error: 'Failed to save database' });
    }
});

// API: Proxy for MoviePilot
app.post('/api/proxy/moviepilot', async (req, res) => {
    try {
        const { target_url, method, headers, body } = req.body;
        
        if (!target_url) {
            return res.status(400).json({ error: 'Missing target_url' });
        }

        console.log(`[Proxy] ${method} -> ${target_url}`);
        console.log(`[Proxy] Headers:`, headers);
        console.log(`[Proxy] Body type:`, typeof body);
        
        // Parse the URL
        const urlObj = new URL(target_url);
        const isHttps = urlObj.protocol === 'https:';
        const requestModule = isHttps ? https : http;
        
        const requestOptions = {
            method: method || 'POST',
            headers: headers || { 'Content-Type': 'application/json' },
            rejectUnauthorized: false, // CRITICAL: Ignore SSL errors for HTTPS
            agent: false // Create a new agent for this request
        };

        const proxyReq = requestModule.request(target_url, requestOptions, (proxyRes) => {
            // Capture the body
            let data = '';
            proxyRes.on('data', (chunk) => {
                data += chunk;
            });

            proxyRes.on('end', () => {
                console.log(`[Proxy] Response Status: ${proxyRes.statusCode}`);
                console.log(`[Proxy] Response Body:`, data.substring(0, 200));
                
                // Try to parse JSON
                let responseData = data;
                const contentType = proxyRes.headers['content-type'];
                if (contentType && contentType.includes('application/json')) {
                    try {
                        responseData = JSON.parse(data);
                    } catch (e) {
                        // ignore
                    }
                }

                res.status(proxyRes.statusCode).json(responseData);
            });
        });

        proxyReq.on('error', (e) => {
            console.error('[Proxy] Request Error:', e);
            res.status(500).json({ 
                error: 'Proxy request failed', 
                details: e.message,
                code: e.code
            });
        });

        // Write body if exists
        if (body) {
            // Body can be either JSON or string (for form data)
            const bodyContent = typeof body === 'string' ? body : JSON.stringify(body);
            console.log(`[Proxy] Sending body:`, bodyContent.substring(0, 200));
            proxyReq.write(bodyContent);
        }
        
        proxyReq.end();

    } catch (error) {
        console.error('[Proxy] Unexpected Error:', error);
        res.status(500).json({ error: 'Internal Proxy Error', details: error.message });
    }
});

// API: Proxy for TMDB
app.use('/tmdb', async (req, res) => {
    try {
        const tmdbPath = req.path.replace(/^\//, ''); // Remove leading slash
        const apiKey = config.tmdb.apiKey; // From config.json or .env
        
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'TMDB API Key not configured', 
                message: '请在 config.json 中配置 tmdb.apiKey' 
            });
        }
        
        // Add API key to query params
        const url = new URL(`${config.tmdb.baseUrl}/${tmdbPath}`);
        url.searchParams.append('api_key', apiKey);
        
        // Forward other query params
        Object.keys(req.query).forEach(key => {
            url.searchParams.append(key, req.query[key]);
        });

        console.log(`[TMDB Proxy] GET -> ${url.pathname}`);

        const response = await fetch(url.toString());
        const data = await response.json();
        
        res.status(response.status).json(data);
    } catch (error) {
        console.error('[TMDB Proxy] Error:', error);
        res.status(500).json({ error: 'TMDB proxy failed', details: error.message });
    }
});

// API: 手动触发报告生成
app.post('/api/report/generate', async (req, res) => {
    try {
        const { type = 'daily', sendToTelegram = false } = req.body;
        
        console.log(`[Report API] 生成${type === 'daily' ? '日报' : '周报'}...`);
        
        const now = new Date();
        let startDate, dateStr;
        
        if (type === 'weekly') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);
            dateStr = `${startDate.toLocaleDateString('zh-CN')} - ${now.toLocaleDateString('zh-CN')}`;
        } else {
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            dateStr = now.toLocaleDateString('zh-CN');
        }
        
        const stats = await getEmbyPlaybackStats(config.emby, startDate, now);
        
        // 生成图片
        const imageBuffer = await generateReportImage(stats, type, dateStr);
        
        if (sendToTelegram && config.telegram?.botToken && config.telegram?.chatId) {
            const success = imageBuffer 
                ? await sendTelegramPhoto(config.telegram.botToken, config.telegram.chatId, imageBuffer, `📊 Emby ${type === 'daily' ? '今日' : '周'}排行榜 - ${dateStr}`)
                : await sendTelegramMessage(config.telegram.botToken, config.telegram.chatId, generateReportText(type, stats, dateStr));
            
            if (success) {
                res.json({ success: true, message: '报告已发送到 Telegram' });
            } else {
                res.status(500).json({ success: false, error: 'Telegram 发送失败' });
            }
        } else if (imageBuffer) {
            // 返回图片
            res.set('Content-Type', 'image/png');
            res.set('Content-Disposition', `inline; filename="report-${type}-${Date.now()}.png"`);
            res.send(imageBuffer);
        } else {
            // 返回文本报告
            res.json({ 
                success: true, 
                type,
                dateRange: dateStr,
                stats: {
                    totalPlays: stats?.totalPlays || 0,
                    totalDuration: stats?.totalDuration || 0,
                    activeUsers: stats?.activeUsers?.size || 0,
                    topMovies: stats?.movies ? [...stats.movies.entries()].slice(0, 10).map(([name, data]) => ({ name, ...data })) : [],
                    topShows: stats?.shows ? [...stats.shows.entries()].slice(0, 10).map(([name, data]) => ({ name, ...data })) : []
                }
            });
        }
    } catch (error) {
        console.error('[Report API] Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API: 获取报告配置状态
app.get('/api/report/status', (req, res) => {
    res.json({
        enabled: config.report?.enabled || false,
        dailyTime: config.report?.dailyTime || '23:00',
        weeklyDay: config.report?.weeklyDay ?? 0,
        weeklyTime: config.report?.weeklyTime || '22:00',
        telegramConfigured: !!(config.telegram?.botToken && config.telegram?.chatId),
        embyConfigured: !!(config.emby?.serverUrl && config.emby?.apiKey)
    });
});

// Serve React App
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ==================== 定时报告推送功能 ====================

// 发送 Telegram 消息
async function sendTelegramMessage(botToken, chatId, message) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        return res.ok;
    } catch (e) {
        console.error('[Report] Telegram 发送失败:', e.message);
        return false;
    }
}

// 发送图片到 Telegram
async function sendTelegramPhoto(botToken, chatId, imageBuffer, caption = '') {
    try {
        const FormData = (await import('form-data')).default;
        const form = new FormData();
        form.append('chat_id', chatId);
        form.append('photo', imageBuffer, { filename: 'report.png', contentType: 'image/png' });
        if (caption) {
            form.append('caption', caption);
        }
        
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            body: form
        });
        
        return res.ok;
    } catch (e) {
        console.error('[Report] Telegram 发送图片失败:', e.message);
        return false;
    }
}

// 获取 Emby 播放统计（增强版，包含时长数据）
async function getEmbyPlaybackStats(embyConfig, startDate, endDate) {
    if (!embyConfig?.serverUrl || !embyConfig?.apiKey) {
        return null;
    }
    
    const baseUrl = (embyConfig.serverUrlInternal || embyConfig.serverUrl).replace(/\/$/, '');
    const stats = {
        totalPlays: 0,
        totalDuration: 0,
        activeUsers: new Set(),
        movies: new Map(),  // Map<name, { plays, duration }>
        shows: new Map(),   // Map<name, { plays, duration }>
        userStats: new Map()
    };
    
    try {
        // 获取用户列表
        const usersRes = await fetch(`${baseUrl}/Users?api_key=${embyConfig.apiKey}`);
        if (!usersRes.ok) return null;
        const users = await usersRes.json();
        
        // 获取每个用户的播放历史
        for (const user of users) {
            try {
                const playedUrl = `${baseUrl}/Users/${user.Id}/Items?` + new URLSearchParams({
                    IncludeItemTypes: 'Movie,Episode',
                    Recursive: 'true',
                    IsPlayed: 'true',
                    SortBy: 'DatePlayed',
                    SortOrder: 'Descending',
                    Limit: '100',
                    Fields: 'UserData,RunTimeTicks',
                    api_key: embyConfig.apiKey
                });
                
                const res = await fetch(playedUrl);
                if (!res.ok) continue;
                const data = await res.json();
                
                for (const item of (data.Items || [])) {
                    const userData = item.UserData;
                    if (!userData?.LastPlayedDate) continue;
                    
                    const playedDate = new Date(userData.LastPlayedDate);
                    if (playedDate < startDate || playedDate > endDate) continue;
                    
                    const itemDuration = (item.RunTimeTicks || 0) / 10000000; // 转为秒
                    const playedDuration = (userData.PlaybackPositionTicks || item.RunTimeTicks || 0) / 10000000;
                    
                    stats.totalPlays++;
                    stats.activeUsers.add(user.Id);
                    stats.totalDuration += playedDuration;
                    
                    // 用户统计
                    if (!stats.userStats.has(user.Name)) {
                        stats.userStats.set(user.Name, { plays: 0, duration: 0 });
                    }
                    const userStat = stats.userStats.get(user.Name);
                    userStat.plays++;
                    userStat.duration += playedDuration;
                    
                    // 内容统计（包含时长）
                    if (item.Type === 'Movie') {
                        const existing = stats.movies.get(item.Name) || { plays: 0, duration: 0 };
                        existing.plays++;
                        existing.duration += itemDuration;
                        stats.movies.set(item.Name, existing);
                    } else if (item.Type === 'Episode' && item.SeriesName) {
                        const existing = stats.shows.get(item.SeriesName) || { plays: 0, duration: 0 };
                        existing.plays++;
                        existing.duration += itemDuration;
                        stats.shows.set(item.SeriesName, existing);
                    }
                }
            } catch (e) {
                // 忽略单个用户的错误
            }
        }
        
        return stats;
    } catch (e) {
        console.error('[Report] 获取 Emby 统计失败:', e.message);
        return null;
    }
}

// 格式化时长
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小时${minutes}分钟`;
    return `${minutes}分钟`;
}

// 生成报告文本
function generateReportText(type, stats, dateRange) {
    const title = type === 'daily' ? '📊 每日观影报告' : '📊 每周观影报告';
    
    let message = `${title}\n`;
    message += `━━━━━━━━━━━━━━━\n`;
    message += `📅 ${dateRange}\n\n`;
    
    if (!stats || stats.totalPlays === 0) {
        message += `暂无播放记录\n`;
        return message;
    }
    
    // 总体统计
    message += `📈 总体统计\n`;
    message += `├ 播放次数: ${stats.totalPlays} 次\n`;
    message += `├ 观看时长: ${formatDuration(stats.totalDuration)}\n`;
    message += `└ 活跃用户: ${stats.activeUsers.size} 人\n\n`;
    
    // 用户排行
    const topUsers = [...stats.userStats.entries()]
        .sort((a, b) => b[1].plays - a[1].plays)
        .slice(0, 5);
    
    if (topUsers.length > 0) {
        message += `👑 用户排行\n`;
        topUsers.forEach(([name, data], i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            const prefix = i === topUsers.length - 1 ? '└' : '├';
            message += `${prefix} ${medal} ${name}: ${data.plays}次 (${formatDuration(data.duration)})\n`;
        });
        message += '\n';
    }
    
    // 热门电影
    const topMovies = [...stats.movies.entries()]
        .sort((a, b) => {
            const aPlays = typeof b[1] === 'object' ? b[1].plays : b[1];
            const bPlays = typeof a[1] === 'object' ? a[1].plays : a[1];
            return aPlays - bPlays;
        })
        .slice(0, 3);
    
    if (topMovies.length > 0) {
        message += `🎬 热门电影\n`;
        topMovies.forEach(([name, data], i) => {
            const prefix = i === topMovies.length - 1 ? '└' : '├';
            const plays = typeof data === 'object' ? data.plays : data;
            message += `${prefix} ${name} (${plays}次)\n`;
        });
        message += '\n';
    }
    
    // 热门剧集
    const topShows = [...stats.shows.entries()]
        .sort((a, b) => {
            const aPlays = typeof b[1] === 'object' ? b[1].plays : b[1];
            const bPlays = typeof a[1] === 'object' ? a[1].plays : a[1];
            return aPlays - bPlays;
        })
        .slice(0, 3);
    
    if (topShows.length > 0) {
        message += `📺 热门剧集\n`;
        topShows.forEach(([name, data], i) => {
            const prefix = i === topShows.length - 1 ? '└' : '├';
            const plays = typeof data === 'object' ? data.plays : data;
            message += `${prefix} ${name} (${plays}集)\n`;
        });
        message += '\n';
    }
    
    message += `━━━━━━━━━━━━━━━\n`;
    message += `⏰ ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
    
    return message;
}

// 生成图片报告
async function generateReportImage(stats, type, dateStr) {
    try {
        const { createCanvas, loadImage } = await import('canvas');
        
        // 颜色配置
        const COLORS = {
            bg: '#1a1a2e',
            primary: '#00d4ff',
            text: '#ffffff',
            textMuted: 'rgba(255, 255, 255, 0.7)',
            textDim: 'rgba(255, 255, 255, 0.5)',
            gold: '#ffd700',
            silver: '#c0c0c0',
            bronze: '#cd7f32'
        };
        
        const WIDTH = 800;
        const HEIGHT = 1200;
        
        const canvas = createCanvas(WIDTH, HEIGHT);
        const ctx = canvas.getContext('2d');
        
        // 获取排行数据
        const topMovies = stats?.movies ? [...stats.movies.entries()]
            .sort((a, b) => b[1].plays - a[1].plays)
            .slice(0, 12)
            .map(([name, data]) => ({ name, ...data })) : [];
        
        const topShows = stats?.shows ? [...stats.shows.entries()]
            .sort((a, b) => b[1].plays - a[1].plays)
            .slice(0, 12)
            .map(([name, data]) => ({ name, ...data })) : [];
        
        // 确定最热门的内容
        let topItem = null;
        let topType = 'movie';
        
        if (topMovies.length > 0 && topShows.length > 0) {
            if (topShows[0].plays > topMovies[0].plays) {
                topItem = topShows[0];
                topType = 'tv';
            } else {
                topItem = topMovies[0];
            }
        } else if (topMovies.length > 0) {
            topItem = topMovies[0];
        } else if (topShows.length > 0) {
            topItem = topShows[0];
            topType = 'tv';
        }
        
        // 绘制背景
        ctx.fillStyle = COLORS.bg;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
        
        // 尝试加载海报作为背景
        if (topItem && config.tmdb?.apiKey) {
            try {
                const searchType = topType === 'movie' ? 'movie' : 'tv';
                const searchUrl = `https://api.themoviedb.org/3/search/${searchType}?api_key=${config.tmdb.apiKey}&query=${encodeURIComponent(topItem.name)}&language=zh-CN`;
                const searchRes = await fetch(searchUrl);
                
                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.results?.length > 0) {
                        const posterPath = searchData.results[0].backdrop_path || searchData.results[0].poster_path;
                        if (posterPath) {
                            const posterUrl = `https://image.tmdb.org/t/p/original${posterPath}`;
                            const posterImg = await loadImage(posterUrl);
                            
                            // 计算填充
                            const scale = Math.max(WIDTH / posterImg.width, HEIGHT / posterImg.height);
                            const scaledWidth = posterImg.width * scale;
                            const scaledHeight = posterImg.height * scale;
                            const offsetX = (WIDTH - scaledWidth) / 2;
                            const offsetY = (HEIGHT - scaledHeight) / 2;
                            
                            ctx.drawImage(posterImg, offsetX, offsetY, scaledWidth, scaledHeight);
                            
                            // 深色遮罩
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                            ctx.fillRect(0, 0, WIDTH, HEIGHT);
                            
                            // 顶部渐变
                            const topGradient = ctx.createLinearGradient(0, 0, 0, 200);
                            topGradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
                            topGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
                            ctx.fillStyle = topGradient;
                            ctx.fillRect(0, 0, WIDTH, 200);
                            
                            // 底部渐变
                            const bottomGradient = ctx.createLinearGradient(0, HEIGHT - 200, 0, HEIGHT);
                            bottomGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
                            bottomGradient.addColorStop(1, 'rgba(0, 0, 0, 0.9)');
                            ctx.fillStyle = bottomGradient;
                            ctx.fillRect(0, HEIGHT - 200, WIDTH, 200);
                        }
                    }
                }
            } catch (e) {
                console.error('[Report] 加载海报失败:', e.message);
            }
        }
        
        // 标题
        ctx.font = 'bold 42px sans-serif';
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = 'center';
        ctx.fillText('Emby 今日排行榜', WIDTH / 2, 60);
        
        // 日期
        const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        const now = new Date();
        const dateDisplay = `${now.getFullYear()}年${String(now.getMonth() + 1).padStart(2, '0')}月${String(now.getDate()).padStart(2, '0')}日 (${dayOfWeek[now.getDay()]})`;
        
        ctx.font = '22px sans-serif';
        const dateWidth = ctx.measureText(dateDisplay).width + 40;
        
        // 日期背景框
        ctx.beginPath();
        ctx.roundRect((WIDTH - dateWidth) / 2, 75, dateWidth, 36, 18);
        ctx.fillStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.fill();
        ctx.strokeStyle = COLORS.primary;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = COLORS.primary;
        ctx.fillText(dateDisplay, WIDTH / 2, 100);
        
        // 列设置
        const colY = 150;
        const leftColX = 40;
        const rightColX = WIDTH / 2 + 20;
        const colWidth = WIDTH / 2 - 60;
        
        // 列标题
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillStyle = COLORS.text;
        ctx.fillText('🎬 电影 Top 12', leftColX, colY);
        ctx.fillText('📺 剧集 Top 12', rightColX, colY);
        
        // 辅助函数：格式化时长
        const fmtDuration = (seconds) => {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        };
        
        // 辅助函数：截断文本
        const truncate = (text, maxWidth) => {
            if (ctx.measureText(text).width <= maxWidth) return text;
            let t = text;
            while (ctx.measureText(t + '...').width > maxWidth && t.length > 0) {
                t = t.slice(0, -1);
            }
            return t + '...';
        };
        
        // 绘制列表项
        const itemHeight = 72;
        const startY = colY + 30;
        
        const drawItem = (item, index, x, y) => {
            const rank = index + 1;
            
            // 排名
            ctx.font = 'bold 20px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillStyle = rank === 1 ? COLORS.gold : rank === 2 ? COLORS.silver : rank === 3 ? COLORS.bronze : COLORS.textMuted;
            ctx.fillText(rank.toString(), x, y + 20);
            
            // 标题
            ctx.font = '18px sans-serif';
            ctx.fillStyle = COLORS.text;
            const titleX = x + 30;
            const displayTitle = truncate(`《${item.name}》`, colWidth - 130);
            ctx.fillText(displayTitle, titleX, y + 20);
            
            // 时长和次数
            ctx.font = '14px sans-serif';
            ctx.fillStyle = COLORS.textDim;
            const duration = fmtDuration(item.duration || 0);
            const statsText = `○ ${duration}  |  ×${item.plays}`;
            ctx.fillText(statsText, titleX, y + 45);
        };
        
        // 绘制电影列表
        topMovies.forEach((movie, i) => {
            if (i < 12) drawItem(movie, i, leftColX, startY + i * itemHeight);
        });
        
        // 绘制剧集列表
        topShows.forEach((show, i) => {
            if (i < 12) drawItem(show, i, rightColX, startY + i * itemHeight);
        });
        
        // 空列表提示
        if (topMovies.length === 0) {
            ctx.font = '16px sans-serif';
            ctx.fillStyle = COLORS.textDim;
            ctx.textAlign = 'center';
            ctx.fillText('暂无播放记录', leftColX + colWidth / 2, startY + 100);
        }
        
        if (topShows.length === 0) {
            ctx.font = '16px sans-serif';
            ctx.fillStyle = COLORS.textDim;
            ctx.textAlign = 'center';
            ctx.fillText('暂无播放记录', rightColX + colWidth / 2, startY + 100);
        }
        
        // 底部热门影视名称
        if (topItem) {
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = COLORS.primary;
            ctx.fillText(topItem.name, WIDTH / 2, HEIGHT - 40);
        }
        
        return canvas.toBuffer('image/png');
    } catch (e) {
        console.error('[Report] 生成图片报告失败:', e.message);
        return null;
    }
}

// 发送日报
async function sendDailyReport() {
    console.log('[Report] 正在生成日报...');
    
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const stats = await getEmbyPlaybackStats(config.emby, startOfDay, now);
    const dateStr = now.toLocaleDateString('zh-CN');
    
    // 优先发送图片报告
    const imageBuffer = await generateReportImage(stats, 'daily', dateStr);
    
    let success = false;
    if (imageBuffer) {
        success = await sendTelegramPhoto(
            config.telegram?.botToken,
            config.telegram?.chatId,
            imageBuffer,
            `📊 Emby 今日排行榜 - ${dateStr}`
        );
    }
    
    // 如果图片发送失败，发送文本报告
    if (!success) {
        const message = generateReportText('daily', stats, dateStr);
        success = await sendTelegramMessage(
            config.telegram?.botToken,
            config.telegram?.chatId,
            message
        );
    }
    
    if (success) {
        console.log('[Report] 日报发送成功');
    } else {
        console.log('[Report] 日报发送失败');
    }
}

// 发送周报
async function sendWeeklyReport() {
    console.log('[Report] 正在生成周报...');
    
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const stats = await getEmbyPlaybackStats(config.emby, startOfWeek, now);
    const dateRange = `${startOfWeek.toLocaleDateString('zh-CN')} - ${now.toLocaleDateString('zh-CN')}`;
    
    // 优先发送图片报告
    const imageBuffer = await generateReportImage(stats, 'weekly', dateRange);
    
    let success = false;
    if (imageBuffer) {
        success = await sendTelegramPhoto(
            config.telegram?.botToken,
            config.telegram?.chatId,
            imageBuffer,
            `📊 Emby 周报 - ${dateRange}`
        );
    }
    
    // 如果图片发送失败，发送文本报告
    if (!success) {
        const message = generateReportText('weekly', stats, dateRange);
        success = await sendTelegramMessage(
            config.telegram?.botToken,
            config.telegram?.chatId,
            message
        );
    }
    
    if (success) {
        console.log('[Report] 周报发送成功');
    } else {
        console.log('[Report] 周报发送失败');
    }
}

// 设置定时任务
function setupReportScheduler() {
    const reportConfig = config.report;
    
    if (!reportConfig?.enabled) {
        console.log('[Report] 定时报告未启用');
        return;
    }
    
    if (!config.telegram?.botToken || !config.telegram?.chatId) {
        console.log('[Report] Telegram 未配置，定时报告已禁用');
        return;
    }
    
    if (!config.emby?.serverUrl || config.emby?.serverUrl === 'http://your-emby-server:8096') {
        console.log('[Report] Emby 未配置，定时报告已禁用');
        return;
    }
    
    console.log('[Report] 定时报告已启用');
    
    // 解析时间配置
    const dailyTime = reportConfig.dailyTime || '23:00';
    const weeklyDay = reportConfig.weeklyDay ?? 0; // 默认周日
    const weeklyTime = reportConfig.weeklyTime || '22:00';
    
    console.log(`[Report] 日报时间: 每天 ${dailyTime}`);
    console.log(`[Report] 周报时间: 每周${['日','一','二','三','四','五','六'][weeklyDay]} ${weeklyTime}`);
    
    // 每分钟检查是否需要发送报告
    setInterval(() => {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const currentDay = now.getDay();
        
        // 检查日报时间
        if (currentTime === dailyTime) {
            sendDailyReport();
        }
        
        // 检查周报时间
        if (currentDay === weeklyDay && currentTime === weeklyTime) {
            sendWeeklyReport();
        }
    }, 60000); // 每分钟检查
}

// ==================== 服务器启动 ====================

app.listen(PORT, () => {
    const startTime = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const configSource = fs.existsSync(configPath) ? 'config.json' : '.env / defaults';
    const hasValidTmdbKey = config.tmdb.apiKey && config.tmdb.apiKey !== 'your_tmdb_api_key_here';
    
    console.log(`
╔════════════════════════════════════════════════════════╗
║  🚀 StreamHub Monitor Server v${VERSION.padEnd(23)}║
╠════════════════════════════════════════════════════════╣
║  📡 端口:         ${PORT.toString().padEnd(35)}║
║  📂 数据目录:     ${path.basename(DATA_DIR).padEnd(35)}║
║  🔧 配置源:       ${configSource.padEnd(35)}║
║  🕐 启动时间:     ${startTime.padEnd(35)}║
╠════════════════════════════════════════════════════════╣`);
    
    if (hasValidTmdbKey) {
        console.log(`║  ✅ TMDB API:     已配置                              ║`);
    } else {
        console.log(`║  ⚠️  TMDB API:     未配置 (必需)                      ║`);
    }
    
    if (config.emby?.serverUrl && config.emby?.serverUrl !== 'http://your-emby-server:8096') {
        console.log(`║  ✅ Emby:         已配置                              ║`);
    }
    
    if (config.moviepilot?.url && config.moviepilot?.url !== 'https://your-moviepilot-server.com') {
        console.log(`║  ✅ MoviePilot:   已配置                              ║`);
    }
    
    console.log(`╚════════════════════════════════════════════════════════╝\n`);
    
    // First run tips
    if (isFirstRun) {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🎉 欢迎使用 StreamHub Monitor!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n📋 快速开始指南:');
        console.log('   1. 编辑 config.json 文件');
        console.log('   2. 填入 TMDB API Key (必需)');
        console.log('   3. 配置 Emby 和 MoviePilot (可选)');
        console.log('   4. 重启服务器: Ctrl+C 然后 node server.js');
        console.log('\n📚 详细配置说明: 查看 CONFIG.md');
        console.log('🔒 安全提示: config.json 不会被提交到 Git');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
    
    // Configuration warnings
    if (!hasValidTmdbKey) {
        console.log('⚠️  警告: TMDB API Key 未配置或使用默认值');
        console.log('   → 编辑 config.json 中的 tmdb.apiKey');
        console.log('   → 获取地址: https://www.themoviedb.org/settings/api\n');
    }
    
    // Runtime info
    console.log('📊 运行信息:');
    console.log(`   → 访问地址: http://localhost:${PORT}`);
    console.log(`   → 进程 PID: ${process.pid}`);
    console.log(`   → Node 版本: ${process.version}`);
    console.log(`   → 平台: ${process.platform}`);
    console.log('\n💡 提示: 修改配置文件后需要重启服务器才能生效');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 启动定时报告调度器
    setupReportScheduler();
});
