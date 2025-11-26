import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import https from 'https';
import http from 'http';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Version info
const VERSION = '2.2.0';
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
  auth: {
    enabled: true,
    password: process.env.ADMIN_PASSWORD || ''
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
    "auth": {
      "enabled": true,
      "username": "admin",
      "password": "",
      "_说明": "管理员账号配置 - 填写明文密码，首次启动后自动加密",
      "_提示": "留空则首次访问时在网页设置密码"
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
    "bot": {
      "defaultQuota": 3,
      "checkinReward": 10,
      "exchangeRate": 50,
      "adminUsers": [],
      "_说明": "TG 机器人求片功能配置",
      "_defaultQuota": "新用户默认求片额度",
      "_checkinReward": "每日签到获得的爆米花数量",
      "_exchangeRate": "兑换1次求片额度需要的爆米花数量",
      "_adminUsers": "管理员 TG 用户 ID 列表，可在机器人中用 /start 查看"
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

// ==================== 管理员密码自动哈希 ====================
// 检查是否配置了明文密码（非哈希格式），自动转换为哈希
if (config.auth?.password && config.auth.password.length > 0 && config.auth.password.length < 64) {
  // 明文密码（哈希后是64位），需要转换
  console.log('🔐 检测到明文密码，正在加密...');
  const hash = crypto.createHash('sha256').update(config.auth.password).digest('hex');
  config.auth.password = hash;
  
  // 更新配置文件
  try {
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    configData.auth = configData.auth || {};
    configData.auth.password = hash;
    configData.auth.passwordHashed = true; // 标记已哈希
    fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    console.log('✅ 管理员密码已加密保存');
  } catch (e) {
    console.error('⚠️  保存加密密码失败:', e.message);
  }
} else if (!config.auth?.password) {
  console.log('⚠️  管理员密码未配置 - 首次访问时需在网页设置');
}

// 设置默认用户名
if (!config.auth?.username) {
  config.auth = config.auth || {};
  config.auth.username = 'admin';
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

// ==================== 认证系统 ====================

// Session store (简单的内存存储，生产环境建议使用 Redis)
const sessions = new Map();
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24小时

// 生成随机 token
function generateToken() {
    return Array.from(crypto.randomBytes(32), byte => byte.toString(16).padStart(2, '0')).join('');
}

// 认证中间件
function requireAuth(req, res, next) {
    // 如果认证未启用，直接通过
    if (!config.auth?.enabled) {
        return next();
    }
    
    // 如果密码未设置（首次使用），允许通过设置密码
    if (!config.auth?.password) {
        return next();
    }
    
    const token = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ error: '未授权：缺少认证令牌' });
    }
    
    const session = sessions.get(token);
    if (!session || Date.now() > session.expiry) {
        sessions.delete(token);
        return res.status(401).json({ error: '未授权：令牌无效或已过期' });
    }
    
    // 刷新过期时间
    session.expiry = Date.now() + SESSION_TIMEOUT;
    next();
}

// 清理过期 session
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (now > session.expiry) {
            sessions.delete(token);
        }
    }
}, 60 * 60 * 1000); // 每小时清理一次

// ==================== 认证 API ====================

// 检查认证状态
app.get('/api/auth/status', (req, res) => {
    const authEnabled = config.auth?.enabled !== false;
    const hasPassword = !!config.auth?.password;
    
    res.json({
        authEnabled,
        needsSetup: authEnabled && !hasPassword,
        adminUsername: config.auth?.username || 'admin',
        isAuthenticated: false // 前端会检查 localStorage 中的 token
    });
});

// 设置初始密码（仅在未设置时可用）
app.post('/api/auth/setup', async (req, res) => {
    try {
        if (config.auth?.password) {
            return res.status(400).json({ error: '密码已设置' });
        }
        
        const { username, password } = req.body;
        if (!password || password.length < 6) {
            return res.status(400).json({ error: '密码至少6个字符' });
        }
        
        // 使用简单的加密（生产环境建议使用 bcrypt）
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        
        // 更新配置
        config.auth = config.auth || {};
        config.auth.username = username || 'admin';
        config.auth.password = hash;
        config.auth.enabled = true;
        
        // 保存到 config.json
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        configData.auth = config.auth;
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
        
        // 生成 token
        const token = generateToken();
        sessions.set(token, {
            createdAt: Date.now(),
            expiry: Date.now() + SESSION_TIMEOUT
        });
        
        console.log(`✅ 管理员账号已设置: ${config.auth.username}`);
        
        res.json({
            success: true,
            token,
            username: config.auth.username,
            message: '密码设置成功'
        });
    } catch (error) {
        console.error('设置密码失败:', error);
        res.status(500).json({ error: '设置密码失败' });
    }
});

// 登录
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!config.auth?.password) {
            return res.status(400).json({ error: '请先设置密码' });
        }
        
        // 验证用户名（如果配置了）
        const adminUsername = config.auth?.username || 'admin';
        if (username && username !== adminUsername) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 验证密码
        const crypto = await import('crypto');
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        
        if (hash !== config.auth.password) {
            return res.status(401).json({ error: '用户名或密码错误' });
        }
        
        // 生成 token
        const token = generateToken();
        sessions.set(token, {
            createdAt: Date.now(),
            expiry: Date.now() + SESSION_TIMEOUT
        });
        
        console.log(`✅ 管理员登录成功: ${adminUsername}`);
        
        res.json({
            success: true,
            token,
            username: adminUsername,
            message: '登录成功'
        });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ error: '登录失败' });
    }
});

// 登出
app.post('/api/auth/logout', (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (token) {
        sessions.delete(token);
    }
    res.json({ success: true, message: '登出成功' });
});

// 验证 token
app.post('/api/auth/verify', (req, res) => {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    
    if (!token) {
        return res.status(401).json({ valid: false });
    }
    
    const session = sessions.get(token);
    if (!session || Date.now() > session.expiry) {
        sessions.delete(token);
        return res.status(401).json({ valid: false });
    }
    
    // 刷新过期时间
    session.expiry = Date.now() + SESSION_TIMEOUT;
    res.json({ valid: true });
});

// ==================== API 路由（需要认证） ====================

// API: Get server configuration (for frontend)
app.get('/api/config', requireAuth, (req, res) => {
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
app.get('/api/db', requireAuth, (req, res) => {
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
app.post('/api/db', requireAuth, (req, res) => {
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
app.post('/api/proxy/moviepilot', requireAuth, async (req, res) => {
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
app.post('/api/report/generate', requireAuth, async (req, res) => {
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
app.get('/api/report/status', requireAuth, (req, res) => {
    res.json({
        enabled: config.report?.enabled || false,
        dailyTime: config.report?.dailyTime || '23:00',
        weeklyDay: config.report?.weeklyDay ?? 0,
        weeklyTime: config.report?.weeklyTime || '22:00',
        telegramConfigured: !!(config.telegram?.botToken && config.telegram?.chatId),
        embyConfigured: !!(config.emby?.serverUrl && config.emby?.apiKey)
    });
});

// ==================== Telegram Bot 功能 ====================

// Bot 用户数据文件
const BOT_USERS_FILE = path.join(DATA_DIR, 'bot_users.json');

// 初始化 Bot 用户数据
function loadBotUsers() {
    try {
        if (fs.existsSync(BOT_USERS_FILE)) {
            return JSON.parse(fs.readFileSync(BOT_USERS_FILE, 'utf-8'));
        }
    } catch (e) {
        console.error('[Bot] 加载用户数据失败:', e.message);
    }
    return {};
}

function saveBotUsers(users) {
    try {
        fs.writeFileSync(BOT_USERS_FILE, JSON.stringify(users, null, 2));
    } catch (e) {
        console.error('[Bot] 保存用户数据失败:', e.message);
    }
}

// 获取 Bot 配置（带默认值）
function getBotConfig() {
    const botConfig = config.bot || {};
    return {
        defaultQuota: botConfig.defaultQuota ?? 3,          // 默认求片额度
        checkinReward: botConfig.checkinReward ?? 10,       // 签到奖励爆米花
        exchangeRate: botConfig.exchangeRate ?? 50,         // 多少爆米花换一次额度
        adminUsers: botConfig.adminUsers || []              // 管理员 TG 用户 ID
    };
}

// 获取或创建用户
function getOrCreateUser(userId, username) {
    const users = loadBotUsers();
    const botConfig = getBotConfig();
    
    if (!users[userId]) {
        users[userId] = {
            id: userId,
            username: username || '',
            popcorn: 0,                           // 爆米花积分
            quota: botConfig.defaultQuota,        // 求片额度
            totalCheckins: 0,                     // 累计签到天数
            lastCheckin: null,                    // 上次签到日期
            requests: [],                         // 求片历史
            createdAt: new Date().toISOString()
        };
        saveBotUsers(users);
    } else if (username && users[userId].username !== username) {
        users[userId].username = username;
        saveBotUsers(users);
    }
    
    return users[userId];
}

// 更新用户数据
function updateUser(userId, updates) {
    const users = loadBotUsers();
    if (users[userId]) {
        Object.assign(users[userId], updates);
        saveBotUsers(users);
    }
}

// 发送 Bot 消息
async function sendBotMessage(chatId, text, options = {}) {
    if (!config.telegram?.botToken) {
        console.error('[Bot] 发送消息失败: Bot Token 未配置');
        return false;
    }
    
    try {
        const body = {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML',
            ...options
        };
        
        console.log(`[Bot] 发送消息到 ${chatId}: ${text.substring(0, 100)}...`);
        
        const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            console.error(`[Bot] 发送消息失败: ${res.status}`, errData);
            return false;
        }
        
        console.log('[Bot] 消息发送成功');
        return true;
    } catch (e) {
        console.error('[Bot] 发送消息异常:', e.message);
        return false;
    }
}

// 搜索 TMDB
async function searchTMDB(query, type = 'multi') {
    console.log(`[Bot] 搜索 TMDB: "${query}" (类型: ${type})`);
    
    if (!config.tmdb?.apiKey) {
        console.error('[Bot] TMDB API Key 未配置!');
        return [];
    }
    
    try {
        const searchUrl = `${config.tmdb.baseUrl}/search/${type}?api_key=${config.tmdb.apiKey}&query=${encodeURIComponent(query)}&language=zh-CN&include_adult=false`;
        console.log(`[Bot] TMDB 请求: ${searchUrl.replace(config.tmdb.apiKey, '***')}`);
        
        const res = await fetch(searchUrl);
        console.log(`[Bot] TMDB 响应状态: ${res.status}`);
        
        if (res.ok) {
            const data = await res.json();
            const results = data.results?.slice(0, 5) || [];
            console.log(`[Bot] TMDB 搜索结果: ${results.length} 条`);
            results.forEach((r, i) => {
                console.log(`[Bot]   ${i+1}. ${r.title || r.name} (${r.media_type}) ID:${r.id}`);
            });
            return results;
        } else {
            const errText = await res.text();
            console.error(`[Bot] TMDB 请求失败: ${res.status} - ${errText}`);
        }
    } catch (e) {
        console.error('[Bot] TMDB 搜索异常:', e.message);
    }
    return [];
}

// 处理 Bot 命令
async function handleBotCommand(message) {
    const chatId = message.chat.id;
    const userId = message.from.id.toString();
    const username = message.from.username || message.from.first_name || 'User';
    const text = message.text || '';
    
    console.log(`[Bot] 收到消息 - 用户: ${username} (${userId}), 内容: "${text}"`);
    
    const botConfig = getBotConfig();
    
    // 解析命令
    const [command, ...args] = text.split(/\s+/);
    const cmdLower = command.toLowerCase();
    
    // /start - 欢迎消息
    if (cmdLower === '/start' || cmdLower === '/帮助' || cmdLower === '/help') {
        const user = getOrCreateUser(userId, username);
        await sendBotMessage(chatId, `
🎬 <b>欢迎使用 StreamHub Bot!</b>

你好 <b>${username}</b>，我可以帮你：

📌 <b>可用命令</b>
/签到 - 每日签到领取 ${botConfig.checkinReward} 🍿
/余额 - 查看爆米花和求片额度
/兑换 - 用 ${botConfig.exchangeRate} 🍿 兑换 1 次求片额度
/求片 <片名> - 搜索并提交求片请求

📊 <b>你的状态</b>
🍿 爆米花: ${user.popcorn}
🎫 求片额度: ${user.quota}
📅 累计签到: ${user.totalCheckins} 天
        `.trim());
        return;
    }
    
    // /签到 - 签到
    if (cmdLower === '/签到' || cmdLower === '/checkin') {
        const user = getOrCreateUser(userId, username);
        const today = new Date().toISOString().split('T')[0];
        
        if (user.lastCheckin === today) {
            await sendBotMessage(chatId, `
😅 <b>${username}</b>，你今天已经签到过了！

明天再来吧~

🍿 当前爆米花: ${user.popcorn}
🎫 求片额度: ${user.quota}
            `.trim());
            return;
        }
        
        // 签到成功
        const newPopcorn = user.popcorn + botConfig.checkinReward;
        const newCheckins = user.totalCheckins + 1;
        
        updateUser(userId, {
            popcorn: newPopcorn,
            totalCheckins: newCheckins,
            lastCheckin: today
        });
        
        // 随机鼓励语
        const encouragements = ['太棒了!', '坚持就是胜利!', '继续加油!', '签到达人!', '积少成多!'];
        const encourage = encouragements[Math.floor(Math.random() * encouragements.length)];
        
        await sendBotMessage(chatId, `
✅ <b>签到成功!</b> ${encourage}

🍿 获得 +${botConfig.checkinReward} 爆米花
📅 累计签到: ${newCheckins} 天

当前状态:
🍿 爆米花: ${newPopcorn}
🎫 求片额度: ${user.quota}
        `.trim());
        return;
    }
    
    // /余额 - 查看余额
    if (cmdLower === '/余额' || cmdLower === '/balance' || cmdLower === '/我的') {
        const user = getOrCreateUser(userId, username);
        const recentRequests = user.requests?.slice(-3) || [];
        
        let requestHistory = '暂无求片记录';
        if (recentRequests.length > 0) {
            requestHistory = recentRequests.map(r => 
                `• ${r.title} (${r.year}) - ${r.status === 'pending' ? '⏳处理中' : r.status === 'completed' ? '✅已完成' : '❌已拒绝'}`
            ).join('\n');
        }
        
        await sendBotMessage(chatId, `
👤 <b>${username} 的账户</b>

💰 <b>资产</b>
🍿 爆米花: ${user.popcorn}
🎫 求片额度: ${user.quota}

📊 <b>统计</b>
📅 累计签到: ${user.totalCheckins} 天
🎬 累计求片: ${user.requests?.length || 0} 次

📝 <b>最近求片</b>
${requestHistory}

💡 提示: ${botConfig.exchangeRate} 🍿 可兑换 1 次求片额度
        `.trim());
        return;
    }
    
    // /兑换 - 兑换额度
    if (cmdLower === '/兑换' || cmdLower === '/exchange') {
        const user = getOrCreateUser(userId, username);
        
        if (user.popcorn < botConfig.exchangeRate) {
            await sendBotMessage(chatId, `
❌ <b>爆米花不足!</b>

🍿 当前: ${user.popcorn}
🍿 需要: ${botConfig.exchangeRate}
🍿 还差: ${botConfig.exchangeRate - user.popcorn}

💡 每日签到可获得 ${botConfig.checkinReward} 🍿
            `.trim());
            return;
        }
        
        // 扣除爆米花，增加额度
        const newPopcorn = user.popcorn - botConfig.exchangeRate;
        const newQuota = user.quota + 1;
        
        updateUser(userId, {
            popcorn: newPopcorn,
            quota: newQuota
        });
        
        await sendBotMessage(chatId, `
✅ <b>兑换成功!</b>

🍿 消耗: -${botConfig.exchangeRate}
🎫 获得: +1 求片额度

当前状态:
🍿 爆米花: ${newPopcorn}
🎫 求片额度: ${newQuota}
        `.trim());
        return;
    }
    
    // /求片 - 搜索并求片
    if (cmdLower === '/求片' || cmdLower === '/request' || cmdLower === '/搜索' || cmdLower === '/search') {
        const query = args.join(' ').trim();
        
        if (!query) {
            await sendBotMessage(chatId, `
🔍 <b>求片用法</b>

/求片 <片名>

例如:
/求片 流浪地球
/求片 Breaking Bad
            `.trim());
            return;
        }
        
        const user = getOrCreateUser(userId, username);
        
        if (user.quota <= 0) {
            await sendBotMessage(chatId, `
❌ <b>求片额度不足!</b>

🎫 当前额度: 0
🍿 爆米花: ${user.popcorn}

💡 使用 /兑换 用 ${botConfig.exchangeRate} 🍿 换取 1 次额度
💡 或每日 /签到 获得爆米花
            `.trim());
            return;
        }
        
        await sendBotMessage(chatId, `🔍 正在搜索 "<b>${query}</b>"...`);
        
        const results = await searchTMDB(query);
        
        if (results.length === 0) {
            await sendBotMessage(chatId, `
😕 未找到 "<b>${query}</b>" 的结果

💡 请尝试:
• 检查拼写是否正确
• 使用英文原名搜索
• 使用更简短的关键词
            `.trim());
            return;
        }
        
        // 显示搜索结果，带 inline keyboard
        const keyboard = results.map((item, index) => {
            const title = item.title || item.name;
            const year = (item.release_date || item.first_air_date || '').split('-')[0] || '未知';
            const type = item.media_type === 'movie' ? '🎬' : '📺';
            return [{
                text: `${type} ${title} (${year})`,
                callback_data: `req_${item.id}_${item.media_type}`
            }];
        });
        
        keyboard.push([{ text: '❌ 取消', callback_data: 'req_cancel' }]);
        
        await sendBotMessage(chatId, `
🎬 <b>搜索结果</b>: ${query}

请选择要求片的内容:
        `.trim(), {
            reply_markup: { inline_keyboard: keyboard }
        });
        return;
    }
    
    // 管理员命令
    if (botConfig.adminUsers.includes(userId)) {
        // /充值 @用户 数量 - 给用户充值爆米花
        if (cmdLower === '/充值' || cmdLower === '/addpopcorn') {
            // 简化版本，只给自己充值测试
            if (args.length >= 1) {
                const amount = parseInt(args[0]);
                if (!isNaN(amount) && amount > 0) {
                    const user = getOrCreateUser(userId, username);
                    updateUser(userId, { popcorn: user.popcorn + amount });
                    await sendBotMessage(chatId, `✅ 已充值 ${amount} 🍿 给 ${username}`);
                    return;
                }
            }
            await sendBotMessage(chatId, '用法: /充值 <数量>');
            return;
        }
        
        // /设置额度 数量 - 设置自己的额度
        if (cmdLower === '/设置额度' || cmdLower === '/setquota') {
            if (args.length >= 1) {
                const amount = parseInt(args[0]);
                if (!isNaN(amount) && amount >= 0) {
                    updateUser(userId, { quota: amount });
                    await sendBotMessage(chatId, `✅ 已设置求片额度为 ${amount}`);
                    return;
                }
            }
            await sendBotMessage(chatId, '用法: /设置额度 <数量>');
            return;
        }
    }
}

// 处理回调查询（按钮点击）
async function handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const userId = callbackQuery.from.id.toString();
    const username = callbackQuery.from.username || callbackQuery.from.first_name || 'User';
    const data = callbackQuery.data;
    
    // 取消操作
    if (data === 'req_cancel') {
        await editBotMessage(chatId, messageId, '❌ 已取消求片');
        return;
    }
    
    // 处理求片确认
    if (data.startsWith('req_')) {
        const [, tmdbId, mediaType] = data.split('_');
        
        const user = getOrCreateUser(userId, username);
        
        if (user.quota <= 0) {
            await answerCallback(callbackQuery.id, '❌ 求片额度不足!');
            return;
        }
        
        // 获取详细信息
        let itemInfo = null;
        try {
            const detailUrl = `${config.tmdb.baseUrl}/${mediaType}/${tmdbId}?api_key=${config.tmdb.apiKey}&language=zh-CN`;
            const res = await fetch(detailUrl);
            if (res.ok) {
                itemInfo = await res.json();
            }
        } catch (e) {
            console.error('[Bot] 获取详情失败:', e.message);
        }
        
        if (!itemInfo) {
            await answerCallback(callbackQuery.id, '❌ 获取信息失败');
            return;
        }
        
        const title = itemInfo.title || itemInfo.name;
        const year = (itemInfo.release_date || itemInfo.first_air_date || '').split('-')[0] || '未知';
        const overview = itemInfo.overview?.substring(0, 100) + (itemInfo.overview?.length > 100 ? '...' : '') || '暂无简介';
        
        // 扣除额度
        const newQuota = user.quota - 1;
        const requestRecord = {
            tmdbId: parseInt(tmdbId),
            title,
            year,
            mediaType,
            status: 'pending',
            requestedAt: new Date().toISOString()
        };
        
        const newRequests = [...(user.requests || []), requestRecord];
        updateUser(userId, {
            quota: newQuota,
            requests: newRequests
        });
        
        // 更新消息
        await editBotMessage(chatId, messageId, `
✅ <b>求片成功!</b>

🎬 <b>${title}</b> (${year})
${mediaType === 'movie' ? '类型: 电影' : '类型: 剧集'}

📝 ${overview}

🎫 剩余额度: ${newQuota}

管理员会尽快处理你的请求~
        `.trim());
        
        // 通知管理员
        if (config.telegram?.chatId) {
            const posterUrl = itemInfo.poster_path 
                ? `https://image.tmdb.org/t/p/w500${itemInfo.poster_path}` 
                : null;
            
            const adminKeyboard = {
                inline_keyboard: [[
                    { text: '✅ 已完成', callback_data: `admin_done_${userId}_${tmdbId}` },
                    { text: '❌ 拒绝', callback_data: `admin_reject_${userId}_${tmdbId}` }
                ], [
                    { text: '🔗 TMDB', url: `https://www.themoviedb.org/${mediaType}/${tmdbId}` }
                ]]
            };
            
            const adminMsg = `
🎬 <b>新的求片请求</b>

👤 用户: ${username} (ID: ${userId})
📽️ 片名: <b>${title}</b> (${year})
🎞️ 类型: ${mediaType === 'movie' ? '电影' : '剧集'}

📝 ${overview}
            `.trim();
            
            if (posterUrl) {
                await sendBotPhoto(config.telegram.chatId, posterUrl, adminMsg, adminKeyboard);
            } else {
                await sendBotMessage(config.telegram.chatId, adminMsg, { reply_markup: adminKeyboard });
            }
        }
        
        await answerCallback(callbackQuery.id, '✅ 求片成功!');
        return;
    }
    
    // 管理员处理求片
    if (data.startsWith('admin_done_') || data.startsWith('admin_reject_')) {
        const botConfig = getBotConfig();
        const adminId = callbackQuery.from.id.toString();
        
        // 检查是否是管理员
        if (!botConfig.adminUsers.includes(adminId)) {
            await answerCallback(callbackQuery.id, '❌ 你没有权限执行此操作');
            return;
        }
        
        const parts = data.split('_');
        const action = parts[1]; // done 或 reject
        const targetUserId = parts[2];
        const tmdbId = parts[3];
        
        // 更新用户的求片状态
        const users = loadBotUsers();
        if (users[targetUserId]) {
            const requests = users[targetUserId].requests || [];
            const reqIndex = requests.findIndex(r => r.tmdbId === parseInt(tmdbId));
            if (reqIndex !== -1) {
                requests[reqIndex].status = action === 'done' ? 'completed' : 'rejected';
                requests[reqIndex].processedAt = new Date().toISOString();
                users[targetUserId].requests = requests;
                saveBotUsers(users);
                
                // 通知用户
                const req = requests[reqIndex];
                const statusEmoji = action === 'done' ? '✅' : '❌';
                const statusText = action === 'done' ? '已完成' : '已被拒绝';
                
                await sendBotMessage(targetUserId, `
${statusEmoji} <b>求片状态更新</b>

🎬 <b>${req.title}</b> (${req.year})

状态: ${statusText}

${action === 'done' ? '🎉 感谢你的耐心等待!' : '😔 抱歉，暂时无法满足此请求'}
                `.trim());
            }
        }
        
        // 更新管理员消息
        const originalText = callbackQuery.message.text || callbackQuery.message.caption || '';
        const statusLine = action === 'done' ? '\n\n✅ 已标记完成' : '\n\n❌ 已拒绝';
        
        if (callbackQuery.message.photo) {
            await editBotCaption(chatId, messageId, originalText + statusLine);
        } else {
            await editBotMessage(chatId, messageId, originalText + statusLine);
        }
        
        await answerCallback(callbackQuery.id, action === 'done' ? '已标记完成' : '已拒绝');
        return;
    }
}

// 编辑消息
async function editBotMessage(chatId, messageId, text) {
    if (!config.telegram?.botToken) return false;
    
    try {
        const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/editMessageText`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                text: text,
                parse_mode: 'HTML'
            })
        });
        return res.ok;
    } catch (e) {
        console.error('[Bot] 编辑消息失败:', e.message);
        return false;
    }
}

// 编辑图片说明
async function editBotCaption(chatId, messageId, caption) {
    if (!config.telegram?.botToken) return false;
    
    try {
        const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/editMessageCaption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                message_id: messageId,
                caption: caption,
                parse_mode: 'HTML'
            })
        });
        return res.ok;
    } catch (e) {
        console.error('[Bot] 编辑说明失败:', e.message);
        return false;
    }
}

// 发送图片
async function sendBotPhoto(chatId, photoUrl, caption, replyMarkup = null) {
    if (!config.telegram?.botToken) return false;
    
    try {
        const body = {
            chat_id: chatId,
            photo: photoUrl,
            caption: caption,
            parse_mode: 'HTML'
        };
        
        if (replyMarkup) {
            body.reply_markup = replyMarkup;
        }
        
        const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        return res.ok;
    } catch (e) {
        console.error('[Bot] 发送图片失败:', e.message);
        return false;
    }
}

// 回答回调查询
async function answerCallback(callbackQueryId, text) {
    if (!config.telegram?.botToken) return false;
    
    try {
        const res = await fetch(`https://api.telegram.org/bot${config.telegram.botToken}/answerCallbackQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                callback_query_id: callbackQueryId,
                text: text
            })
        });
        return res.ok;
    } catch (e) {
        console.error('[Bot] 回答回调失败:', e.message);
        return false;
    }
}

// Telegram Bot Webhook
app.post('/api/telegram/webhook', async (req, res) => {
    try {
        const update = req.body;
        console.log('[Bot] 收到 Webhook:', JSON.stringify(update).substring(0, 500));
        
        // 处理普通消息
        if (update.message?.text) {
            console.log('[Bot] 处理文本消息...');
            await handleBotCommand(update.message);
        }
        
        // 处理回调查询（按钮点击）
        if (update.callback_query) {
            console.log('[Bot] 处理回调查询:', update.callback_query.data);
            await handleCallbackQuery(update.callback_query);
        }
        
        res.json({ ok: true });
    } catch (error) {
        console.error('[Bot] Webhook 处理错误:', error);
        res.json({ ok: true }); // 总是返回 200，避免 Telegram 重试
    }
});

// API: 获取 Bot 配置（前端用）
app.get('/api/bot/config', requireAuth, (req, res) => {
    const botConfig = getBotConfig();
    res.json({
        defaultQuota: botConfig.defaultQuota,
        checkinReward: botConfig.checkinReward,
        exchangeRate: botConfig.exchangeRate,
        webhookUrl: config.bot?.webhookUrl || ''
    });
});

// API: 获取所有 Bot 用户（管理员用）
app.get('/api/bot/users', requireAuth, (req, res) => {
    const users = loadBotUsers();
    res.json(Object.values(users));
});

// API: 设置 Webhook
app.post('/api/bot/webhook/set', requireAuth, async (req, res) => {
    const { webhookUrl } = req.body;
    
    if (!config.telegram?.botToken) {
        return res.status(400).json({ success: false, error: 'Telegram Bot Token 未配置' });
    }
    
    try {
        const apiUrl = `https://api.telegram.org/bot${config.telegram.botToken}/setWebhook`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: webhookUrl })
        });
        
        const result = await response.json();
        
        if (result.ok) {
            // 保存到配置
            config.bot = config.bot || {};
            config.bot.webhookUrl = webhookUrl;
            
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            configData.bot = config.bot;
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
            
            res.json({ success: true, message: 'Webhook 设置成功' });
        } else {
            res.status(400).json({ success: false, error: result.description });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
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
