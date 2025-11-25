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

// Create an HTTPS agent that ignores SSL errors
const httpsAgent = new https.Agent({  
  rejectUnauthorized: false
});

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
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
        const apiKey = '83020de488099117460a41251fcb64a8'; // From .env
        
        // Add API key to query params
        const url = new URL(`https://api.themoviedb.org/3/${tmdbPath}`);
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
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
});
