import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import { fileURLToPath } from 'url';
import axios from 'axios';
import https from 'https';

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

        const response = await axios({
            method: method || 'POST',
            url: target_url,
            headers: headers || { 'Content-Type': 'application/json' },
            data: body,
            httpsAgent: httpsAgent, // Ignore SSL errors
            validateStatus: () => true // Resolve promise for all status codes
        });

        console.log(`[Proxy] Response Status: ${response.status}`);

        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('[Proxy] Error:', error.message);
        if (error.cause) console.error('[Proxy] Cause:', error.cause);
        if (error.response) {
             console.error('[Proxy] Response Data:', error.response.data);
        }
        
        res.status(500).json({ 
            error: 'Proxy request failed', 
            details: error.message,
            cause: error.cause ? String(error.cause) : undefined
        });
    }
});

// Proxy for TMDB (Simple pass-through to avoid CORS on client if needed, though client handles it mostly)
// Note: In this architecture, we might still rely on client-side requests for TMDB to reduce server load,
// but we can add a proxy here if needed. For now, let's keep TMDB client-side as per original design.

// Serve React App
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Data directory: ${DATA_DIR}`);
});
