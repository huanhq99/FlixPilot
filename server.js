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
const VERSION = '2.1.22';
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
      "apiKey": "your_emby_api_key_here",
      "_说明": "可选配置"
    },
    "moviepilot": {
      "url": "https://your-moviepilot-server.com",
      "username": "your_username",
      "password": "your_password",
      "subscribeUser": "hub",
      "_说明": "可选配置"
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
            } : { configured: false }
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

// Serve React App
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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
});
